/**
 * Teacher Lesson Manager — Content Organization & Video-Gating
 *
 * Chronological workspace for managing chapters and interactive content blocks.
 * Includes Video-Gated Learning configuration interface:
 * - Toggle fast-forward restriction
 * - Set watch threshold percentage
 * - Configure checkpoint alerts
 * - PWA offline: content pre-fetched to IndexedDB for offline drafting
 * - STUDENT_VIEW mode: all authoring controls are hidden, content is read-only
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, X, GripVertical, ChevronDown, ChevronUp,
  BookOpen, PlayCircle, Shield, AlertCircle, WifiOff
} from 'lucide-react';
import api from '../../../lib/axios';
import { saveOfflineData, getOfflineData } from '../../../lib/offline-store';

interface Chapter {
  _id?: string;
  title: string;
  description?: string;
  items: ContentItem[];
}

interface ContentItem {
  _id?: string;
  type: 'video' | 'text' | 'quiz' | 'resource';
  title: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
}

interface VideoGatingConfig {
  enabled: boolean;
  blockForwardSeeking: boolean;
  checkpoints: number[];
  minWatchPercentToUnlock: number;
  showCheckpointAlerts: boolean;
  description?: string;
}

interface CourseOption {
  _id: string;
  title: { en: string };
}

export function TeacherLessons() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'so' | 'ar';

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videoGating, setVideoGating] = useState<VideoGatingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedChapter, setExpandedChapter] = useState<number | null>(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [coursePermission, setCoursePermission] = useState<string>('STUDENT_VIEW');
  const [searchParams] = useSearchParams();
  const isReadOnly = coursePermission !== 'COURSE_BUILDER';

  // Auto-select course from query parameter (used by STUDENT_VIEW card click)
  useEffect(() => {
    const courseIdFromQuery = searchParams.get('courseId');
    if (courseIdFromQuery && courseIdFromQuery !== selectedCourse) {
      setSelectedCourse(courseIdFromQuery);
    }
    // Run only once on mount / when query param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Fetch course permission from dashboard
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/teacher-portal/dashboard');
        setCoursePermission(data.data?.teacher?.coursePermission === 'COURSE_BUILDER' ? 'COURSE_BUILDER' : 'STUDENT_VIEW');
      } catch { /* fail closed — stay read-only on error */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/courses?limit=100');
        const courseList: CourseOption[] = data.data?.results || data.data?.data || [];
        setCourses(courseList);
        saveOfflineData('teacher-courses', courseList);
      } catch {
        const cached = await getOfflineData<CourseOption[]>('teacher-courses');
        if (cached) setCourses(cached);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/teacher-portal/courses/${selectedCourse}/chapters`);
        setChapters(data.data?.chapters || []);
        setVideoGating(data.data?.videoGating || null);
        saveOfflineData(`chapters-${selectedCourse}`, data.data?.chapters || []);
      } catch (err: any) {
        const cached = await getOfflineData<Chapter[]>(`chapters-${selectedCourse}`);
        if (cached) setChapters(cached);
        else setError(err.response?.data?.message || 'Failed to load chapters');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourse]);

  const saveAll = async () => {
    if (!selectedCourse || isReadOnly) return;
    setSaving(true);
    try {
      await api.patch(`/teacher-portal/courses/${selectedCourse}/chapters`, { chapters });
      if (videoGating) {
        await api.patch(`/teacher-portal/courses/${selectedCourse}/video-gating`, videoGating);
      }
      setSuccess(lang === 'so' ? 'Si guul leh ayaa loo keydiyay' : 'Saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addChapter = () => {
    if (isReadOnly) return;
    setChapters([...chapters, { title: '', description: '', items: [] }]);
    setExpandedChapter(chapters.length);
  };

  const updateChapter = (idx: number, updates: Partial<Chapter>) => {
    if (isReadOnly) return;
    const list = [...chapters];
    list[idx] = { ...list[idx], ...updates };
    setChapters(list);
  };

  const removeChapter = (idx: number) => {
    if (isReadOnly) return;
    setChapters(chapters.filter((_, i) => i !== idx));
    setExpandedChapter(null);
  };

  const addItem = (chapterIdx: number, type: ContentItem['type']) => {
    if (isReadOnly) return;
    const list = [...chapters];
    list[chapterIdx].items = [...list[chapterIdx].items, { type, title: '', content: '', videoUrl: '' }];
    setChapters(list);
  };

  const updateItem = (chapterIdx: number, itemIdx: number, updates: Partial<ContentItem>) => {
    if (isReadOnly) return;
    const list = [...chapters];
    list[chapterIdx].items[itemIdx] = { ...list[chapterIdx].items[itemIdx], ...updates };
    setChapters(list);
  };

  const removeItem = (chapterIdx: number, itemIdx: number) => {
    if (isReadOnly) return;
    const list = [...chapters];
    list[chapterIdx].items = list[chapterIdx].items.filter((_, i) => i !== itemIdx);
    setChapters(list);
  };

  const itemTypeIcons: Record<string, string> = { video: '🎬', text: '📝', quiz: '❓', resource: '📎' };
  const itemTypeLabels: Record<string, Record<string, string>> = {
    video: { en: 'Video Lesson', so: 'Cashar Fiidiyow', ar: 'درس فيديو' },
    text: { en: 'Text Block', so: 'Qoraal', ar: 'نص' },
    quiz: { en: 'Quiz', so: 'Quiz', ar: 'اختبار' },
    resource: { en: 'Resource', so: 'Xog', ar: 'مصدر' },
  };

  const toggleGating = () => {
    if (isReadOnly) return;
    if (videoGating?.enabled) {
      setVideoGating(null);
    } else {
      setVideoGating({
        enabled: true,
        blockForwardSeeking: true,
        checkpoints: [50, 100],
        minWatchPercentToUnlock: 85,
        showCheckpointAlerts: true,
        description: '',
      });
    }
  };

  const addCheckpoint = () => {
    if (!videoGating || isReadOnly) return;
    setVideoGating({ ...videoGating, checkpoints: [...videoGating.checkpoints, 75].sort((a, b) => a - b) });
  };

  const updateCheckpoint = (idx: number, val: number) => {
    if (!videoGating || isReadOnly) return;
    const cps = [...videoGating.checkpoints];
    cps[idx] = Math.min(100, Math.max(1, val));
    setVideoGating({ ...videoGating, checkpoints: cps.sort((a, b) => a - b) });
  };

  const removeCheckpoint = (idx: number) => {
    if (!videoGating || videoGating.checkpoints.length <= 1 || isReadOnly) return;
    setVideoGating({ ...videoGating, checkpoints: videoGating.checkpoints.filter((_, i) => i !== idx) });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
            {lang === 'so' ? 'Maamulka Casharrada' : lang === 'ar' ? 'إدارة الدروس' : 'Lesson Manager'}
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {lang === 'so' ? 'Abaabul cutubyada iyo waxyaabaha koorsooyinkaaga' : 'Organize chapters and content blocks for your courses'}
          </p>
          {isOffline && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <WifiOff className="h-3 w-3" /> {lang === 'so' ? 'Offline mode' : 'Offline mode — changes will sync when reconnected'}
            </p>
          )}
        </div>
        {!isReadOnly && (
          <button
            onClick={saveAll}
            disabled={saving || !selectedCourse}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {lang === 'so' ? 'Keydi' : 'Save All'}
          </button>
        )}
        {isReadOnly && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold">
            👁️ {lang === 'so' ? 'Aragtida Ardayga' : 'Student View'}
          </span>
        )}
      </div>

      <div className="mb-6">
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
        >
          <option value="">{lang === 'so' ? '-- Dooro koorso --' : '-- Select a course --'}</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{typeof c.title === 'object' ? c.title.en : c.title}</option>
          ))}
        </select>
      </div>

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

      {/* Video-Gating config — hidden in STUDENT_VIEW */}
      {selectedCourse && !isReadOnly && (
        <div className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] cursor-pointer" onClick={toggleGating}>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              {lang === 'so' ? 'Xakamaynta Muuqaalka' : 'Video-Gated Learning'}
            </h2>
            <div className={`w-10 h-5 rounded-full transition-colors ${videoGating?.enabled ? 'bg-emerald-500' : 'bg-[var(--color-border-default)]'} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${videoGating?.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <AnimatePresence>
            {videoGating?.enabled && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                        {lang === 'so' ? 'Boqolkiiba Daawashada' : 'Min Watch % to Unlock'}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="range" min={1} max={100} value={videoGating.minWatchPercentToUnlock}
                          onChange={(e) => setVideoGating({ ...videoGating, minWatchPercentToUnlock: parseInt(e.target.value) })}
                          className="flex-1 accent-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 w-10">{videoGating.minWatchPercentToUnlock}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                      <input type="checkbox" id="blockSeek" checked={videoGating.blockForwardSeeking}
                        onChange={(e) => setVideoGating({ ...videoGating, blockForwardSeeking: e.target.checked })}
                        className="accent-emerald-600 rounded" />
                      <label htmlFor="blockSeek" className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {lang === 'so' ? 'Xannib Hore-u-boodista' : 'Block Fast-Forward Seeking'}
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                        {lang === 'so' ? 'Baraha Hubinta (%)' : 'Checkpoints (%)'}
                      </label>
                      <button onClick={addCheckpoint} className="text-[10px] text-emerald-600 hover:underline font-medium">+ {lang === 'so' ? 'Kudar' : 'Add'}</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {videoGating.checkpoints.map((cp, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-[var(--color-surface-tertiary)] rounded-lg px-3 py-1">
                          <input value={cp} onChange={(e) => updateCheckpoint(idx, parseInt(e.target.value) || 0)}
                            className="w-10 bg-transparent text-xs font-bold text-emerald-700 outline-none text-center" />
                          <span className="text-xs text-[var(--color-text-tertiary)]">%</span>
                          {videoGating.checkpoints.length > 1 && (
                            <button onClick={() => removeCheckpoint(idx)} className="text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                      {lang === 'so' ? 'Fariinta Xakamaynta' : 'Gating Message'}
                    </label>
                    <input value={videoGating.description || ''}
                      onChange={(e) => setVideoGating({ ...videoGating, description: e.target.value })}
                      placeholder={lang === 'so' ? 'Fariin lagu arki doono xannibaadda...' : 'Message shown when content is blocked...'}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : !selectedCourse ? (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {lang === 'so' ? 'Fadlan dooro koorso' : 'Please select a course to manage its lessons'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter, chIdx) => (
            <motion.div key={chIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border transition-all ${expandedChapter === chIdx
                ? 'border-emerald-300 dark:border-emerald-700 bg-[var(--color-surface-primary)] shadow-md'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]'}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedChapter(expandedChapter === chIdx ? null : chIdx)}>
                {!isReadOnly && <GripVertical className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />}
                <BookOpen className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <input value={chapter.title} onChange={(e) => updateChapter(chIdx, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isReadOnly}
                  placeholder={lang === 'so' ? 'Ciwaanka Cutubka...' : 'Chapter title...'}
                  className={`flex-1 bg-transparent border-none outline-none text-sm font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] ${isReadOnly ? 'cursor-default' : ''}`} />
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{chapter.items.length} items</span>
                {!isReadOnly && (
                  <button onClick={(e) => { e.stopPropagation(); removeChapter(chIdx); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--color-text-tertiary)] hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {expandedChapter === chIdx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <AnimatePresence>
                {expandedChapter === chIdx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-[var(--color-border-subtle)] pt-3 space-y-2">
                      <textarea value={chapter.description || ''} onChange={(e) => updateChapter(chIdx, { description: e.target.value })}
                        disabled={isReadOnly}
                        placeholder={lang === 'so' ? 'Sharaxaadda cutubka...' : 'Chapter description...'} rows={1}
                        className={`w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500 resize-none ${isReadOnly ? 'opacity-70 cursor-default' : ''}`} />
                      {chapter.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="ml-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{itemTypeIcons[item.type] || '📄'}</span>
                            <select value={item.type} onChange={(e) => updateItem(chIdx, itemIdx, { type: e.target.value as ContentItem['type'] })}
                              disabled={isReadOnly}
                              className={`text-[10px] bg-[var(--color-surface-tertiary)] rounded px-2 py-1 border-none outline-none text-[var(--color-text-secondary)] ${isReadOnly ? 'opacity-70 cursor-default' : ''}`}>
                              <option value="video">{lang === 'so' ? 'Fiidiyow' : 'Video'}</option>
                              <option value="text">{lang === 'so' ? 'Qoraal' : 'Text'}</option>
                              <option value="quiz">{lang === 'so' ? 'Quiz' : 'Quiz'}</option>
                              <option value="resource">{lang === 'so' ? 'Xog' : 'Resource'}</option>
                            </select>
                            <input value={item.title} onChange={(e) => updateItem(chIdx, itemIdx, { title: e.target.value })}
                              disabled={isReadOnly}
                              placeholder={lang === 'so' ? 'Ciwaanka...' : 'Item title...'}
                              className={`flex-1 bg-transparent border-none outline-none text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] ${isReadOnly ? 'cursor-default' : ''}`} />
                            {!isReadOnly && (
                              <button onClick={() => removeItem(chIdx, itemIdx)} className="p-1 text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                            )}
                          </div>
                          {item.type === 'video' && (
                            <div className="mt-2 space-y-2">
                              <input value={item.videoUrl || ''} onChange={(e) => updateItem(chIdx, itemIdx, { videoUrl: e.target.value })}
                                disabled={isReadOnly}
                                placeholder={lang === 'so' ? 'URL-ga Fiidiyowga...' : 'Video URL...'}
                                className={`w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500 ${isReadOnly ? 'opacity-70 cursor-default' : ''}`} />
                              <div className="flex items-center gap-2">
                                <PlayCircle className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                                <input type="number" min={0} value={item.duration || ''} onChange={(e) => updateItem(chIdx, itemIdx, { duration: parseInt(e.target.value) || 0 })}
                                  disabled={isReadOnly}
                                  placeholder={lang === 'so' ? 'Daqiiqado...' : 'Duration (min)...'}
                                  className={`w-24 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500 ${isReadOnly ? 'opacity-70 cursor-default' : ''}`} />
                              </div>
                            </div>
                          )}
                          {item.type === 'text' && (
                            <textarea value={item.content || ''} onChange={(e) => updateItem(chIdx, itemIdx, { content: e.target.value })}
                              disabled={isReadOnly}
                              placeholder={lang === 'so' ? 'Qoraalka...' : 'Text content...'} rows={2}
                              className={`mt-2 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-emerald-500 resize-none ${isReadOnly ? 'opacity-70 cursor-default' : ''}`} />
                          )}
                        </div>
                      ))}
                      {!isReadOnly && (
                        <div className="flex gap-2 ml-4 pt-2">
                          {(['video', 'text', 'resource'] as ContentItem['type'][]).map((type) => (
                            <button key={type} onClick={() => addItem(chIdx, type)}
                              className="flex items-center gap-1 rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-text-tertiary)] hover:border-emerald-400 hover:text-emerald-600 transition-all">
                              <Plus className="h-3 w-3" />{itemTypeLabels[type]?.[lang] || type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {!isReadOnly && (
            <button onClick={addChapter}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border-default)] py-6 text-sm font-medium text-[var(--color-text-tertiary)] hover:border-emerald-400 hover:text-emerald-600 transition-all">
              <Plus className="h-5 w-5" />
              {lang === 'so' ? 'Kudar Cutub Cusub' : 'Add New Chapter'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TeacherLessons;