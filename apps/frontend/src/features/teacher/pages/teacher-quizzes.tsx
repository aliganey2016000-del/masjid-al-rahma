/**
 * Teacher Quiz Builder — Full Quiz Engine with 10 Question Types
 *
 * Allows teachers to manage quizzes within their assigned courses:
 * - Multiple Choice (MCQ)
 * - True/False
 * - Matching Pairs
 * - Ordering / Sorting
 * - Fill in the Blank
 * - Word Scramble
 * - Sentence Builder
 * - Picture Choice
 * - Swipe Sort (Drag & Drop ordering)
 * - Listen & Write (dictation)
 *
 * Each type has a specialized sub-renderer that previews exactly how
 * the question will display to students.
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Edit3, Eye, Save, X, ChevronDown, ChevronUp, Copy,
  GripVertical, ArrowLeft, Clock, AlertCircle, CheckCircle,
  FileQuestion, ListFilter, ArrowUpDown, Image, Mic, Type, AlignJustify
} from 'lucide-react';
import api from '../../../lib/axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType = 'mcq' | 'true_false' | 'matching' | 'ordering' | 'fill_blank' | 'word_scramble' | 'sentence_build' | 'picture_choice' | 'swipe_sort' | 'listen_write';

interface QuizQuestion {
  _id?: string;
  type: QuestionType;
  question: string;
  options?: string[];
  choices?: { image: string; label?: string }[];
  pairs?: { left: string; right: string }[];
  items?: string[];
  correctAnswer?: string | boolean | number;
  correctIndex?: number;
  explanation?: string;
  points?: number;
  audioUrl?: string;
}

interface QuizData {
  _id?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showResults?: string;
  maxAttempts?: number;
}

interface CourseOption {
  _id: string;
  title: { en: string };
  status: string;
}

interface ChapterOption {
  _id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Question Type Definitions
// ---------------------------------------------------------------------------

const questionTypes: { value: QuestionType; label: string; icon: JSX.Element; description: string }[] = [
  { value: 'mcq', label: 'Multiple Choice', icon: <ListFilter className="h-4 w-4" />, description: 'Single correct answer from options' },
  { value: 'true_false', label: 'True / False', icon: <CheckCircle className="h-4 w-4" />, description: 'Binary true or false answer' },
  { value: 'matching', label: 'Matching Pairs', icon: <ArrowLeft className="h-4 w-4" />, description: 'Match left items to right items' },
  { value: 'ordering', label: 'Ordering / Sorting', icon: <ArrowUpDown className="h-4 w-4" />, description: 'Arrange items in correct order' },
  { value: 'fill_blank', label: 'Fill in the Blank', icon: <Type className="h-4 w-4" />, description: 'Type the missing word/phrase' },
  { value: 'word_scramble', label: 'Word Scramble', icon: <AlignJustify className="h-4 w-4" />, description: 'Unscramble letters to form a word' },
  { value: 'sentence_build', label: 'Sentence Builder', icon: <AlignJustify className="h-4 w-4" />, description: 'Arrange words into a correct sentence' },
  { value: 'picture_choice', label: 'Picture Choice', icon: <Image className="h-4 w-4" />, description: 'Select the correct image' },
  { value: 'swipe_sort', label: 'Swipe Sort', icon: <GripVertical className="h-4 w-4" />, description: 'Drag & drop items into categories' },
  { value: 'listen_write', label: 'Listen & Write', icon: <Mic className="h-4 w-4" />, description: 'Listen to audio and type what you hear' },
];

const defaultQuestionTemplates: Record<QuestionType, QuizQuestion> = {
  mcq: { type: 'mcq', question: '', options: ['', '', '', ''], correctIndex: 0, points: 1, explanation: '' },
  true_false: { type: 'true_false', question: '', correctAnswer: true, points: 1, explanation: '' },
  matching: { type: 'matching', question: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }], points: 2, explanation: '' },
  ordering: { type: 'ordering', question: '', items: ['', '', '', ''], points: 2, explanation: '' },
  fill_blank: { type: 'fill_blank', question: '', correctAnswer: '', points: 1, explanation: '' },
  word_scramble: { type: 'word_scramble', question: '', correctAnswer: '', points: 2, explanation: '' },
  sentence_build: { type: 'sentence_build', question: '', correctAnswer: '', points: 2, explanation: '' },
  picture_choice: { type: 'picture_choice', question: '', options: [''], choices: [], correctIndex: 0, points: 1, explanation: '' },
  swipe_sort: { type: 'swipe_sort', question: '', items: [], points: 2, explanation: '' },
  listen_write: { type: 'listen_write', question: '', audioUrl: '', correctAnswer: '', points: 2, explanation: '' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeacherQuizzes() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'so' | 'ar';
  const { courseId } = useParams<{ courseId?: string }>();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId || '');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz Editor State
  const [editingQuiz, setEditingQuiz] = useState<QuizData | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<QuizQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch assigned courses
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/courses?limit=100');
        setCourses(data.data?.results || data.data?.data || []);
        if (!courseId) return;
        const found = (data.data?.results || data.data?.data || []).find((c: any) => c._id === courseId);
        if (!found) setError('This course is not assigned to you.');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load courses');
      }
    })();
  }, []);

  // Fetch quizzes when course selected
  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setLoading(true);
      try {
        const [quizRes, chapterRes] = await Promise.all([
          api.get(`/teacher-portal/courses/${selectedCourse}/quizzes`),
          api.get(`/teacher-portal/courses/${selectedCourse}/chapters`),
        ]);
        setQuizzes(quizRes.data.data || []);
        setChapters((chapterRes.data.data?.chapters || []).map((ch: any) => ({
          _id: ch._id,
          title: typeof ch.title === 'object' ? ch.title.en || ch.title : ch.title || 'Untitled',
        })));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourse]);

  // ── Quiz CRUD ──
  const openNewQuiz = () => {
    if (!selectedCourse) { setError('Please select a course first'); return; }
    if (chapters.length === 0) { setError('No chapters found in this course. Create a chapter first.'); return; }
    setEditingQuiz({
      title: '',
      description: '',
      questions: [],
      timeLimit: 0,
      passingScore: 60,
      shuffleQuestions: true,
      showResults: 'immediately',
      maxAttempts: 3,
    });
    setSelectedChapterId(chapters[0]._id);
    setShowEditor(true);
  };

  const openEditQuiz = (quiz: any) => {
    setEditingQuiz({
      _id: quiz._id,
      title: quiz.title || '',
      description: quiz.description || '',
      questions: quiz.questions || [],
      timeLimit: quiz.timeLimit || 0,
      passingScore: quiz.passingScore || 60,
      shuffleQuestions: quiz.shuffleQuestions !== false,
      showResults: quiz.showResults || 'immediately',
      maxAttempts: quiz.maxAttempts || 3,
    });
    setSelectedChapterId(quiz.chapterId || chapters[0]?._id || '');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setEditingQuiz(null);
    setShowEditor(false);
    setExpandedQuestion(null);
    setPreviewQuestion(null);
  };

  const addQuestion = (type: QuestionType) => {
    if (!editingQuiz) return;
    const newQ = { ...defaultQuestionTemplates[type] };
    setEditingQuiz({
      ...editingQuiz,
      questions: [...editingQuiz.questions, newQ],
    });
    setExpandedQuestion(editingQuiz.questions.length);
  };

  const updateQuestion = (idx: number, updates: Partial<QuizQuestion>) => {
    if (!editingQuiz) return;
    const questions = [...editingQuiz.questions];
    questions[idx] = { ...questions[idx], ...updates };
    setEditingQuiz({ ...editingQuiz, questions });
  };

  const removeQuestion = (idx: number) => {
    if (!editingQuiz) return;
    setEditingQuiz({
      ...editingQuiz,
      questions: editingQuiz.questions.filter((_, i) => i !== idx),
    });
    setExpandedQuestion(null);
  };

  const duplicateQuestion = (idx: number) => {
    if (!editingQuiz) return;
    const questions = [...editingQuiz.questions];
    const clone = { ...questions[idx], _id: undefined };
    questions.splice(idx + 1, 0, clone);
    setEditingQuiz({ ...editingQuiz, questions });
  };

  const saveQuiz = async () => {
    if (!editingQuiz || !selectedCourse) return;
    if (!editingQuiz.title.trim()) { setError('Quiz title is required'); return; }
    if (editingQuiz.questions.length === 0) { setError('Add at least one question'); return; }

    setSaving(true);
    try {
      if (editingQuiz._id) {
        await api.patch(`/teacher-portal/courses/${selectedCourse}/quizzes/${editingQuiz._id}`, editingQuiz);
      } else {
        await api.post(`/teacher-portal/courses/${selectedCourse}/quizzes`, {
          ...editingQuiz,
          chapterId: selectedChapterId,
        });
      }
      // Refresh
      const { data } = await api.get(`/teacher-portal/courses/${selectedCourse}/quizzes`);
      setQuizzes(data.data || []);
      closeEditor();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!selectedCourse || !confirm('Delete this quiz? This cannot be undone.')) return;
    try {
      await api.delete(`/teacher-portal/courses/${selectedCourse}/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q: any) => q._id !== quizId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete quiz');
    }
  };

  // ── Render ──
  if (showEditor && editingQuiz) return (
    <QuizEditor
      quiz={editingQuiz}
      setQuiz={setEditingQuiz}
      chapters={chapters}
      selectedChapterId={selectedChapterId}
      setSelectedChapterId={setSelectedChapterId}
      expandedQuestion={expandedQuestion}
      setExpandedQuestion={setExpandedQuestion}
      previewQuestion={previewQuestion}
      setPreviewQuestion={setPreviewQuestion}
      onSave={saveQuiz}
      onClose={closeEditor}
      onAddQuestion={addQuestion}
      onUpdateQuestion={updateQuestion}
      onRemoveQuestion={removeQuestion}
      onDuplicateQuestion={duplicateQuestion}
      saving={saving}
      lang={lang}
    />
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
            {lang === 'so' ? 'Maamulka Quiz-yada' : lang === 'ar' ? 'إدارة الاختبارات' : 'Quiz Management'}
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {lang === 'so' ? 'Abuur oo tafatir quiz-yada koorsooyinkaaga' : 'Create and edit quizzes for your courses'}
          </p>
        </div>
        <button
          onClick={openNewQuiz}
          disabled={!selectedCourse}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {lang === 'so' ? 'Abuur Quiz' : 'Create Quiz'}
        </button>
      </div>

      {/* Course Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
          {lang === 'so' ? 'Dooro Koorso' : 'Select Course'}
        </label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
        >
          <option value="">{lang === 'so' ? '-- Dooro koorso --' : '-- Select a course --'}</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {typeof c.title === 'object' ? c.title.en : c.title} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Quizzes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : !selectedCourse ? (
        <div className="text-center py-20">
          <FileQuestion className="h-16 w-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {lang === 'so' ? 'Fadlan dooro koorso si aad u aragto quiz-yada' : 'Please select a course to view quizzes'}
          </p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20">
          <FileQuestion className="h-16 w-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {lang === 'so' ? 'Ma jiraan quiz-yo koorsadan ku jira' : 'No quizzes in this course yet'}
          </p>
          <button onClick={openNewQuiz} className="mt-4 text-sm font-semibold text-emerald-600 hover:underline">
            {lang === 'so' ? 'Abuur Quiz cusub' : 'Create your first quiz'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz: any) => (
            <motion.div
              key={quiz._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{quiz.title || 'Untitled Quiz'}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      {quiz.questions?.length || 0} {lang === 'so' ? "su'aalood" : 'questions'}
                    </span>
                    {quiz.chapterTitle && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)]">
                        {quiz.chapterTitle}
                      </span>
                    )}
                    {quiz.timeLimit > 0 && (
                      <span className="text-[10px] flex items-center gap-1 text-[var(--color-text-tertiary)]">
                        <Clock className="h-3 w-3" /> {quiz.timeLimit} min
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-emerald-600">
                      {lang === 'so' ? 'Gudub' : 'Pass'}: {quiz.passingScore || 60}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditQuiz(quiz)}
                    className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteQuiz(quiz._id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Quiz Editor (Full Screen Overlay)
// ───────────────────────────────────────────────────────────────────────────────

function QuizEditor({
  quiz, setQuiz, chapters, selectedChapterId, setSelectedChapterId,
  expandedQuestion, setExpandedQuestion, previewQuestion, setPreviewQuestion,
  onSave, onClose, onAddQuestion, onUpdateQuestion, onRemoveQuestion,
  onDuplicateQuestion, saving, lang,
}: {
  quiz: QuizData; setQuiz: (q: QuizData) => void;
  chapters: ChapterOption[]; selectedChapterId: string; setSelectedChapterId: (id: string) => void;
  expandedQuestion: number | null; setExpandedQuestion: (idx: number | null) => void;
  previewQuestion: QuizQuestion | null; setPreviewQuestion: (q: QuizQuestion | null) => void;
  onSave: () => void; onClose: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (idx: number, u: Partial<QuizQuestion>) => void;
  onRemoveQuestion: (idx: number) => void;
  onDuplicateQuestion: (idx: number) => void;
  saving: boolean; lang: 'en' | 'so' | 'ar';
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-surface-secondary)] overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface-primary)] border-b border-[var(--color-border-subtle)] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors">
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
            <input
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              placeholder={lang === 'so' ? 'Ciwaanka Quiz-ka...' : 'Quiz title...'}
              className="text-lg font-bold bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] w-full max-w-md"
            />
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {lang === 'so' ? 'Keydi' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Settings Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4">
          {!quiz._id && (
            <div>
              <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Cutubka' : 'Chapter'}</label>
              <select value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500">
                {chapters.map((ch) => (
                  <option key={ch._id} value={ch._id}>{ch.title}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Waqti Xad' : 'Time Limit (min)'}</label>
            <input type="number" min="0" value={quiz.timeLimit || 0}
              onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Gudub %' : 'Passing %'}</label>
            <input type="number" min="0" max="100" value={quiz.passingScore || 60}
              onChange={(e) => setQuiz({ ...quiz, passingScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 60)) })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Isku day Max' : 'Max Attempts'}</label>
            <input type="number" min="1" max="10" value={quiz.maxAttempts || 3}
              onChange={(e) => setQuiz({ ...quiz, maxAttempts: parseInt(e.target.value) || 3 })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4">
          <textarea
            value={quiz.description || ''}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
            placeholder={lang === 'so' ? 'Sharaxaadda quiz-ka (ikhtiyaar)...' : 'Quiz description (optional)...'}
            rows={2}
            className="w-full bg-transparent border-none outline-none text-sm text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-tertiary)] resize-none"
          />
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {lang === 'so' ? "Su'aalaha" : 'Questions'} ({quiz.questions.length})
            </h2>
          </div>

          {quiz.questions.map((q, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border transition-all ${
                expandedQuestion === idx
                  ? 'border-emerald-300 dark:border-emerald-700 bg-[var(--color-surface-primary)] shadow-md'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]'
              }`}
            >
              {/* Question Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
              >
                <GripVertical className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-6">{idx + 1}.</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  q.type === 'mcq' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  q.type === 'true_false' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                }`}>
                  {questionTypes.find((t) => t.value === q.type)?.label || q.type}
                </span>
                <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">
                  {q.question || (lang === 'so' ? "Su'aal cusub" : 'New question')}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{q.points || 1} pts</span>

                <button onClick={(e) => { e.stopPropagation(); setPreviewQuestion(q); }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] hover:text-emerald-600 transition-colors">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicateQuestion(idx); }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] hover:text-blue-600 transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveQuestion(idx); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {expandedQuestion === idx ? <ChevronUp className="h-4 w-4 text-[var(--color-text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />}
              </div>

              {/* Expanded Question Editor */}
              <AnimatePresence>
                {expandedQuestion === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-[var(--color-border-subtle)] pt-4 space-y-3">
                      <QuestionEditor
                        question={q}
                        onChange={(updates) => onUpdateQuestion(idx, updates)}
                        lang={lang}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Add Question Button */}
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {questionTypes.map((qt) => (
                <button
                  key={qt.value}
                  onClick={() => onAddQuestion(qt.value)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-3 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all"
                >
                  <span className="text-emerald-600">{qt.icon}</span>
                  <span className="text-[10px] font-medium text-[var(--color-text-secondary)] text-center leading-tight">{qt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewQuestion(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface-primary)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-500" />
                {lang === 'so' ? 'Hordhac Arday' : 'Student Preview'}
              </h3>
              <QuestionPreview question={previewQuestion} lang={lang} />
              <button
                onClick={() => setPreviewQuestion(null)}
                className="mt-4 w-full rounded-xl bg-[var(--color-surface-tertiary)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-colors"
              >
                {lang === 'so' ? 'Xir' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Single Question Editor
// ───────────────────────────────────────────────────────────────────────────────

function QuestionEditor({ question, onChange, lang }: { question: QuizQuestion; onChange: (u: Partial<QuizQuestion>) => void; lang: string }) {
  const updateOption = (idx: number, val: string) => {
    const opts = [...(question.options || [])];
    opts[idx] = val;
    onChange({ options: opts });
  };

  const addOption = () => onChange({ options: [...(question.options || []), ''] });
  const removeOption = (idx: number) => onChange({ options: (question.options || []).filter((_, i) => i !== idx) });

  const updatePair = (idx: number, side: 'left' | 'right', val: string) => {
    const pairs = [...(question.pairs || [])];
    if (!pairs[idx]) pairs[idx] = { left: '', right: '' };
    pairs[idx][side] = val;
    onChange({ pairs });
  };
  const addPair = () => onChange({ pairs: [...(question.pairs || []), { left: '', right: '' }] });
  const removePair = (idx: number) => onChange({ pairs: (question.pairs || []).filter((_, i) => i !== idx) });

  const updateItem = (idx: number, val: string) => {
    const items = [...(question.items || [])];
    items[idx] = val;
    onChange({ items });
  };
  const addItem = () => onChange({ items: [...(question.items || []), ''] });
  const removeItem = (idx: number) => onChange({ items: (question.items || []).filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
          {lang === 'so' ? "Su'aasha" : 'Question Text'}
        </label>
        <textarea
          value={question.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder={lang === 'so' ? 'Qor su\'aasha...' : 'Type the question...'}
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-emerald-500 resize-none"
        />
      </div>

      {/* MCQ Options */}
      {(question.type === 'mcq' || question.type === 'picture_choice') && (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
            {lang === 'so' ? 'Doorashooyinka' : 'Options'}
          </label>
          {(question.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctAnswer"
                checked={question.correctIndex === i}
                onChange={() => onChange({ correctIndex: i })}
                className="accent-emerald-600"
              />
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`${lang === 'so' ? 'Doorasho' : 'Option'} ${i + 1}`}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
              />
              {(question.options?.length || 0) > 2 && (
                <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={addOption} className="text-[10px] text-emerald-600 hover:underline font-medium">
            + {lang === 'so' ? 'Kudar doorasho' : 'Add option'}
          </button>
        </div>
      )}

      {/* True/False */}
      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => onChange({ correctAnswer: val })}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                question.correctAnswer === val
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]'
              }`}
            >
              {val ? '✅ True' : '❌ False'}
            </button>
          ))}
        </div>
      )}

      {/* Matching Pairs */}
      {question.type === 'matching' && (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
            {lang === 'so' ? 'Lammaanaha' : 'Pairs (Left → Right)'}
          </label>
          {(question.pairs || []).map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={pair.left}
                onChange={(e) => updatePair(i, 'left', e.target.value)}
                placeholder={lang === 'so' ? 'Bidix' : 'Left'}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
              />
              <span className="text-[var(--color-text-tertiary)]">→</span>
              <input
                value={pair.right}
                onChange={(e) => updatePair(i, 'right', e.target.value)}
                placeholder={lang === 'so' ? 'Midig' : 'Right'}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
              />
              <button onClick={() => removePair(i)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={addPair} className="text-[10px] text-emerald-600 hover:underline font-medium">+ Add pair</button>
        </div>
      )}

      {/* Ordering / Items */}
      {(question.type === 'ordering' || question.type === 'swipe_sort') && (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
            {lang === 'so' ? 'Shayada (sida ay isugu xigaan)' : 'Items (in correct order)'}
          </label>
          {(question.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-tertiary)] w-5">{i + 1}.</span>
              <input
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`${lang === 'so' ? 'Shay' : 'Item'} ${i + 1}`}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
              />
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={addItem} className="text-[10px] text-emerald-600 hover:underline font-medium">+ Add item</button>
        </div>
      )}

      {/* Fill Blank / Word Scramble / Sentence Build / Listen Write */}
      {(question.type === 'fill_blank' || question.type === 'word_scramble' || question.type === 'sentence_build' || question.type === 'listen_write') && (
        <div>
          <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
            {lang === 'so' ? 'Jawaabta Saxda ah' : 'Correct Answer'}
          </label>
          <input
            value={(question.correctAnswer as string) || ''}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            placeholder={lang === 'so' ? 'Jawaabta saxda ah...' : 'Correct answer...'}
            className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
          />
          {question.type === 'listen_write' && (
            <div className="mt-2">
              <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                {lang === 'so' ? 'URL Maqalka' : 'Audio URL'}
              </label>
              <input
                value={question.audioUrl || ''}
                onChange={(e) => onChange({ audioUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Points & Explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Dhibcaha' : 'Points'}</label>
          <input
            type="number" min={1} max={20}
            value={question.points || 1}
            onChange={(e) => onChange({ points: parseInt(e.target.value) || 1 })}
            className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
          {lang === 'so' ? 'Sharaxaad (ikhtiyaar)' : 'Explanation (optional)'}
        </label>
        <input
          value={question.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder={lang === 'so' ? 'Sharaxaad kadib marka la jawaabo...' : 'Shown after answering...'}
          className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500"
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Student Preview Renderer
// ───────────────────────────────────────────────────────────────────────────────

function QuestionPreview({ question, lang }: { question: QuizQuestion; lang: string }) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 font-medium">
        {questionTypes.find((t) => t.value === question.type)?.label || question.type}
      </span>
      <p className="text-sm font-bold text-[var(--color-text-primary)]">{question.question || '(No question text)'}</p>

      {(question.type === 'mcq' || question.type === 'picture_choice') && (
        <div className="space-y-2">
          {(question.options || []).map((opt, i) => (
            <div key={i} className={`rounded-xl border-2 px-4 py-3 text-sm font-medium ${
              question.correctIndex === i
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700'
                : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]'
            }`}>
              <span className="inline-flex w-6 h-6 rounded-full bg-[var(--color-surface-tertiary)] items-center justify-center text-xs mr-2">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {question.correctIndex === i && <span className="ml-2 text-emerald-500">✓</span>}
            </div>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <div key={String(val)} className={`rounded-xl border-2 px-4 py-3 text-center text-sm font-bold ${
              question.correctAnswer === val
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700'
                : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]'
            }`}>
              {val ? '✅ True' : '❌ False'}
            </div>
          ))}
        </div>
      )}

      {question.type === 'matching' && (
        <div className="space-y-2">
          {(question.pairs || []).map((pair, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 font-medium text-[var(--color-text-primary)]">
                {pair.left || '(empty)'}
              </div>
              <span className="text-[var(--color-text-tertiary)]">→</span>
              <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 font-medium text-emerald-700">
                {pair.right || '(empty)'}
              </div>
            </div>
          ))}
        </div>
      )}

      {question.type === 'ordering' && (
        <div className="space-y-1">
          {(question.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)]">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              {item || '(empty)'}
            </div>
          ))}
        </div>
      )}

      {(question.type === 'fill_blank' || question.type === 'word_scramble' || question.type === 'sentence_build') && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
            {lang === 'so' ? 'Jawaabta la filayo:' : 'Expected answer:'}
          </p>
          <p className="text-sm font-bold text-emerald-700">{question.correctAnswer as string || '(not set)'}</p>
        </div>
      )}

      {question.explanation && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-[10px] font-semibold text-amber-700 mb-1">
            {lang === 'so' ? 'Sharaxaad:' : 'Explanation:'}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default TeacherQuizzes;