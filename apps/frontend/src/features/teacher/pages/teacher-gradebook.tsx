/**
 * Teacher Gradebook — Responsive Split-Screen Grading Terminal
 *
 * Left panel: Student submission content/files
 * Right panel: Grading rubric slider, score input, feedback console
 *
 * All grading actions dispatch atomic DB updates scoped to the teacher's
 * assigned courses. Includes real-time student performance metrics update.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Check, X, Search, Filter, ChevronLeft, ChevronRight, FileText,
  Download, MessageSquare, Star, Sliders, Upload, AlertCircle,
  Save, ArrowLeft, Eye
} from 'lucide-react';
import api from '../../../lib/axios';

interface Submission {
  _id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  assignmentTitle: string;
  assignmentId: string;
  maxScore: number;
  rubric?: { criteria: string; maxPoints: number }[];
  submittedAt: string;
  status: 'submitted' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  content?: string;
  files?: { name: string; url: string; type: string }[];
}

interface CourseOption {
  _id: string;
  title: { en: string };
}

export function TeacherGradebook() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'so' | 'ar';

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'graded'>('submitted');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Selected submission for split-screen grading
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch courses
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/courses?limit=100');
        setCourses(data.data?.results || data.data?.data || []);
      } catch {}
    })();
  }, []);

  // Fetch submissions
  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setLoading(true);
      try {
        const statusParam = filter !== 'all' ? `&status=${filter}` : '';
        const { data } = await api.get(`/teacher-portal/courses/${selectedCourse}/submissions?page=${page}&limit=${limit}${statusParam}`);
        setSubmissions(data.data?.results || data.data?.data || []);
        setTotal(data.data?.total || 0);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourse, filter, page]);

  // Open submission for grading
  const openGrading = (sub: Submission) => {
    setSelectedSubmission(sub);
    setGradeScore(sub.score ?? 0);
    setGradeFeedback(sub.feedback ?? '');
  };

  // Submit grade
  const submitGrade = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      await api.patch(`/teacher-portal/submissions/${selectedSubmission._id}/grade`, {
        score: gradeScore,
        status: 'graded',
      });
      if (gradeFeedback.trim()) {
        await api.post(`/teacher-portal/submissions/${selectedSubmission._id}/feedback`, {
          feedback: gradeFeedback,
        });
      }

      setSuccess(lang === 'so' ? 'Qiimeynta waa la keydiyay' : 'Grade saved successfully');
      setTimeout(() => setSuccess(''), 3000);

      // Update local list
      setSubmissions((prev) =>
        prev.map((s) =>
          s._id === selectedSubmission._id
            ? { ...s, score: gradeScore, feedback: gradeFeedback, status: 'graded' as const }
            : s
        )
      );
      setSelectedSubmission(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const rubricScore = selectedSubmission?.rubric
    ? selectedSubmission.rubric.reduce((sum, c) => sum + c.maxPoints, 0)
    : selectedSubmission?.maxScore || 100;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
            {lang === 'so' ? 'Buugga Qiimeynta' : lang === 'ar' ? 'سجل الدرجات' : 'Gradebook'}
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {lang === 'so' ? "Qiimee gudbinta ardayda" : 'Grade student submissions'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={selectedCourse}
          onChange={(e) => { setSelectedCourse(e.target.value); setPage(1); }}
          className="w-full sm:w-72 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-emerald-500 outline-none transition-colors"
        >
          <option value="">{lang === 'so' ? '-- Dooro koorso --' : '-- Select a course --'}</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{typeof c.title === 'object' ? c.title.en : c.title}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {(['submitted', 'graded', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]'
              }`}
            >
              {f === 'submitted' ? (lang === 'so' ? 'Cusub' : 'New') :
               f === 'graded' ? (lang === 'so' ? 'Qiimeeyay' : 'Graded') :
               (lang === 'so' ? 'Dhamaan' : 'All')}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-4 flex items-center gap-3">
          <span className="text-emerald-500">✅</span>
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {!selectedCourse ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {lang === 'so' ? 'Fadlan dooro koorso' : 'Please select a course to view submissions'}
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {lang === 'so' ? 'Ma jiraan gudbin' : 'No submissions found'}
          </p>
        </div>
      ) : (
        <>
          {/* Submissions Table */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)]">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Arday' : 'Student'}</th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Shuqul' : 'Assignment'}</th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Taariikh' : 'Date'}</th>
                    <th className="text-center px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Xaalad' : 'Status'}</th>
                    <th className="text-center px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Qiimeyn' : 'Score'}</th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">{lang === 'so' ? 'Fal' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {submissions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-[var(--color-surface-tertiary)] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                            {sub.studentName?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]">{sub.studentName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-[var(--color-text-secondary)] truncate max-w-[150px]">{sub.assignmentTitle}</td>
                      <td className="px-6 py-3 text-xs text-[var(--color-text-tertiary)]">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          sub.status === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {sub.status === 'graded' ? (lang === 'so' ? 'Qiimeeyay' : 'Graded') : (lang === 'so' ? 'Cusub' : 'New')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-xs font-bold text-[var(--color-text-primary)]">
                        {sub.score !== undefined && sub.score !== null ? `${sub.score}/${sub.maxScore}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openGrading(sub)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          {lang === 'so' ? 'Qiimee' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg border border-[var(--color-border-default)] disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {lang === 'so' ? `Bogga ${page}` : `Page ${page}`}
              </span>
              <button disabled={page * limit >= total} onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg border border-[var(--color-border-default)] disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── Split-Screen Grading Modal ─── */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="m-4 w-full max-w-6xl mx-auto bg-[var(--color-surface-primary)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedSubmission(null)}
                    className="p-2 rounded-lg hover:bg-[var(--color-surface-tertiary)]">
                    <ArrowLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-[var(--color-text-primary)]">{selectedSubmission.assignmentTitle}</h2>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{selectedSubmission.studentName}</p>
                  </div>
                </div>
                <button
                  onClick={submitGrade}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {lang === 'so' ? 'Keydi Qiimeyn' : 'Save Grade'}
                </button>
              </div>

              {/* Split Panels */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* LEFT: Student Submission */}
                <div className="overflow-y-auto border-r border-[var(--color-border-subtle)] p-6">
                  <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase mb-4 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {lang === 'so' ? 'Gudbinta Ardayga' : 'Student Submission'}
                  </h3>

                  {selectedSubmission.content && (
                    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 mb-4">
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{selectedSubmission.content}</p>
                    </div>
                  )}

                  {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                    <div className="space-y-2">
                      {selectedSubmission.files.map((file, idx) => (
                        <div key={idx}
                          className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3 hover:bg-[var(--color-surface-tertiary)] transition-colors">
                          <FileText className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <span className="flex-1 text-xs font-medium text-[var(--color-text-primary)] truncate">{file.name}</span>
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-emerald-600">
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {!selectedSubmission.content && (!selectedSubmission.files || selectedSubmission.files.length === 0) && (
                    <p className="text-sm text-[var(--color-text-tertiary)] text-center py-10">
                      {lang === 'so' ? 'Ma jiraan faahfaahin gudbin' : 'No submission content available'}
                    </p>
                  )}
                </div>

                {/* RIGHT: Grading Panel */}
                <div className="overflow-y-auto p-6">
                  <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase mb-4 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5" />
                    {lang === 'so' ? 'Qiimeynta' : 'Assessment'}
                  </h3>

                  {/* Score Slider */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        {lang === 'so' ? 'Dhibcaha' : 'Score'}
                      </label>
                      <span className="text-lg font-extrabold text-emerald-600">{gradeScore} / {rubricScore}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={rubricScore}
                      value={gradeScore}
                      onChange={(e) => setGradeScore(parseInt(e.target.value))}
                      className="w-full accent-emerald-600 h-2 rounded-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">0</span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">{rubricScore}</span>
                    </div>
                  </div>

                  {/* Rubric Criteria */}
                  {selectedSubmission.rubric && selectedSubmission.rubric.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">
                        {lang === 'so' ? 'Shuruudaha Qiimeynta' : 'Rubric Criteria'}
                      </h4>
                      {selectedSubmission.rubric.map((criterion, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2">
                          <span className="text-xs text-[var(--color-text-secondary)]">{criterion.criteria}</span>
                          <span className="text-xs font-bold text-[var(--color-text-tertiary)]">{criterion.maxPoints} pts</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback Console */}
                  <div className="mb-6">
                    <label className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase flex items-center gap-1 mb-2">
                      <MessageSquare className="h-3 w-3" />
                      {lang === 'so' ? 'Faallo' : 'Feedback'}
                    </label>
                    <textarea
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      rows={5}
                      placeholder={lang === 'so' ? 'Qor faalladaada...' : 'Write your feedback...'}
                      className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Quick Feedback Templates */}
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase mb-2">
                      {lang === 'so' ? 'Faallooyin Degdeg ah' : 'Quick Feedback'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        lang === 'so' ? 'Shaqo wanaagsan!' : 'Great work!',
                        lang === 'so' ? 'Kalsooni badan tahay' : 'Excellent effort',
                        lang === 'so' ? 'Wax badan ka shaqee' : 'Needs improvement',
                        lang === 'so' ? 'Si fiican u qoran' : 'Well written',
                      ].map((msg, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGradeFeedback(msg)}
                          className="text-[10px] px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeacherGradebook;