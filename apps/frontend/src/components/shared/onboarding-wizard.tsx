/**
 * Onboarding Wizard — 3-Step Welcome Flow for New Students
 *
 * Displayed on dashboard when user.onboardingCompleted === false.
 * Guides the student through picking their first course, discovering
 * the AI Tutor, and understanding how to learn — then marks the
 * onboarding as complete so the normal dashboard is shown.
 *
 * Steps:
 *   1. 🎯 Choose Your First Course — Browse & enroll in a course
 *   2. 🤖 Meet Your AI Tutor        — Preview the AI chat companion
 *   3. 🚀 Start Your Journey         — Final encouragement + dismiss
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Sparkles, BookOpen, Bot, Zap,
  ChevronRight, X, GraduationCap, Target,
} from 'lucide-react';
import { useAuth } from '../../store/auth-context';
import api from '../../lib/axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailableCourse {
  _id: string;
  title: { en: string; so: string; ar: string };
  slug: string;
  category: string;
  level: string;
  description?: { en: string; so: string; ar: string };
  duration: number;
  thumbnail?: string;
  enrolledStudents?: number;
  status: string;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEP_ICONS = [GraduationCap, Bot, Target];
const STEP_TITLES: Record<string, { en: string; so: string; ar: string }> = {
  '1': { en: 'Choose Your First Course', so: 'Dooro Koorsadaada Ugu Horeysa', ar: 'اختر دورتك الأولى' },
  '2': { en: 'Meet Your AI Tutor', so: 'Baro Barehaaga AI-ga ah', ar: 'تعرّف على معلمك الذكي' },
  '3': { en: 'Start Your Journey', so: 'Bilow Socdaalkaaga', ar: 'ابدأ رحلتك' },
};

const STEP_DESCRIPTIONS: Record<string, { en: string; so: string; ar: string }> = {
  '1': {
    en: 'Browse our library of Islamic studies courses and pick the one that interests you most — Quran, Fiqh, Aqeedah, Arabic, and more.',
    so: 'Raadi maktabadda casharada Islaamka oo dooro midka kugu xiisaha badan — Qur\'aan, Fiqh, Cajiida, Carabi, iyo kuwa kale.',
    ar: 'تصفح مكتبة الدورات الإسلامية واختر ما يثير اهتمامك — قرآن، فقه، عقيدة، عربية، والمزيد.',
  },
  '2': {
    en: 'Every course comes with a personal AI Tutor that can answer your questions, explain concepts, and even quiz you — available 24/7.',
    so: 'Koorso kasta waxay la socotaa Bare AI oo shaqsi ah oo ka jawaabi kara su\'aalahaaga, sharxi kara fikradaha, oo xitaa imtixaan kugu qaadi kara — la heli karo 24/7.',
    ar: 'كل دورة تأتي مع معلم ذكي شخصي يمكنه الإجابة على أسئلتك وشرح المفاهيم وحتى اختبارك — متاح ٢٤/٧.',
  },
  '3': {
    en: 'You\'re all set! Start learning at your own pace, track your progress, earn badges, and climb the leaderboard.',
    so: 'Waad diyaar tahay! Bilow waxbarashada xawligaaga, la soco horumarkaaga, hel calaamado, oo kor u kac hogaanka.',
    ar: 'أنت جاهز! ابدأ التعلم بوتيرتك الخاصة، تابع تقدمك، اكسب الشارات، وتسلق لوحة المتصدرين.',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'so' | 'ar';
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();

  const [step, setStep] = useState(0); // 0, 1, 2
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Fetch available courses for Step 1
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/courses/available');
        setCourses(data.data?.courses || data.data || []);
      } catch {
        // If API fails, show empty state
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  const handleEnroll = useCallback(async (courseId: string) => {
    setEnrollingId(courseId);
    setEnrollError(null);
    try {
      await api.post(`/courses/${courseId}/enroll`);
      setEnrolled(true);
      setSelectedCourseId(courseId);
    } catch (err: any) {
      setEnrollError(err.response?.data?.message || 'Could not enroll — please try again.');
    } finally {
      setEnrollingId(null);
    }
  }, []);

  const handleNext = () => {
    if (step < 2) {
      setStep(prev => prev + 1);
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    onComplete();
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete();
  };

  const getTitle = (course: AvailableCourse) => {
    if (lang === 'so' && course.title.so) return course.title.so;
    if (lang === 'ar' && course.title.ar) return course.title.ar;
    return course.title.en;
  };

  const catLabels: Record<string, { so: string; ar: string }> = {
    quran: { so: "Qur'aanka", ar: 'القرآن' },
    fiqh: { so: 'Fiqhiga', ar: 'الفقه' },
    aqeedah: { so: 'Cajiidada', ar: 'العقيدة' },
    seerah: { so: 'Siirada', ar: 'السيرة' },
    arabic: { so: 'Carabiga', ar: 'العربية' },
    tajweed: { so: 'Tajwiidka', ar: 'التجويد' },
    hadith: { so: 'Xadiithka', ar: 'الحديث' },
    akhlaq: { so: 'Akhlaaqda', ar: 'الأخلاق' },
  };

  const getCat = (c: string) => (catLabels as any)[c]?.[lang] || c.charAt(0).toUpperCase() + c.slice(1);

  // Configure courses for the multi-column display
  const displayCourses = courses.slice(0, 9); // max 9 for grid

  return (
    <div className="fixed inset-0 z-[101] bg-[var(--color-surface-primary)] overflow-auto">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          {/* Step progress pill */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(s => (
              <motion.div
                key={s}
                animate={{
                  scale: s === step ? 1.1 : 1,
                  opacity: s <= step ? 1 : 0.3,
                }}
                className={`w-8 h-1.5 rounded-full transition-colors duration-300 ${
                  s <= step ? 'bg-emerald-500' : 'bg-[var(--color-border-default)]'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">
            {step + 1} / 3
          </span>
          <button
            onClick={handleSkip}
            className="text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-tertiary)]"
          >
            {lang === 'so' ? 'Ka bood' : lang === 'ar' ? 'تخطي' : 'Skip'}
            <ArrowRight className="h-3 w-3 inline ms-1" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 lg:px-8 py-8 lg:py-12">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Choose Your First Course ── */}
          {step === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/25"
                >
                  <GraduationCap className="h-10 w-10" />
                </motion.div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] mb-3">
                  {STEP_TITLES['1'][lang]}
                </h1>
                <p className="text-sm lg:text-base text-[var(--color-text-tertiary)] max-w-lg mx-auto leading-relaxed">
                  {STEP_DESCRIPTIONS['1'][lang]}
                </p>
              </div>

              {/* Course grid */}
              {loadingCourses ? (
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600" />
                </div>
              ) : displayCourses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[var(--color-text-tertiary)] mb-6">
                    {lang === 'so' ? 'Ma jiraan koorsooyin hadda diyaar ah. Hoos u dhaaf oo bilow.' : lang === 'ar' ? 'لا توجد دورات متاحة حاليًا. تخط وابدأ.' : 'No courses available right now. Skip and start exploring.'}
                  </p>
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    {lang === 'so' ? 'Sii wad' : lang === 'ar' ? 'متابعة' : 'Continue'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                  {displayCourses.map(course => {
                    const isSelected = selectedCourseId === course._id;
                    const isEnrolling = enrollingId === course._id;

                    return (
                      <motion.div
                        key={course._id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCourseId(course._id)}
                        className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                            : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="h-28 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-10 w-10 text-emerald-400/60" />
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="rounded-full bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                              {getCat(course.category)}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] capitalize">{course.level}</span>
                          </div>
                          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1 line-clamp-2">
                            {getTitle(course)}
                          </h3>
                          <p className="text-[10px] text-[var(--color-text-tertiary)]">
                            {course.duration} {lang === 'so' ? 'saacadood' : lang === 'ar' ? 'ساعة' : 'hours'} {course.enrolledStudents ? `• ${course.enrolledStudents} ${lang === 'so' ? 'arday' : lang === 'ar' ? 'طالب' : 'students'}` : ''}
                          </p>

                          {/* Enroll button on selection */}
                          {isSelected && !enrolled && (
                            <motion.button
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              onClick={(e) => { e.stopPropagation(); handleEnroll(course._id); }}
                              disabled={isEnrolling}
                              className="mt-3 w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {isEnrolling ? (
                                <span className="inline-flex items-center gap-1">
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  {lang === 'so' ? 'Isqoritaan...' : lang === 'ar' ? 'تسجيل...' : 'Enrolling...'}
                                </span>
                              ) : (
                                lang === 'so' ? 'Isqor hadda' : lang === 'ar' ? 'سجل الآن' : 'Enroll Now'
                              )}
                            </motion.button>
                          )}

                          {isSelected && !enrolled && enrollError && !isEnrolling && (
                            <p className="mt-2 text-[10px] font-medium text-red-600 dark:text-red-400">
                              {enrollError}
                            </p>
                          )}

                          {isSelected && enrolled && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {lang === 'so' ? 'Waad Isqortay!' : lang === 'ar' ? 'تم التسجيل!' : 'Enrolled!'}
                            </motion.div>
                          )}

                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-3 end-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Bottom nav */}
              {displayCourses.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]">
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {lang === 'so'
                      ? 'Dooro koorso oo isqor — ama hoos u dhaaf'
                      : lang === 'ar'
                        ? 'اختر دورة وسجل — أو تابع بدون تسجيل'
                        : 'Pick a course and enroll — or skip for now'}
                  </p>
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    {lang === 'so' ? 'Sii wad' : lang === 'ar' ? 'متابعة' : 'Continue'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 2: Meet Your AI Tutor ── */}
          {step === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-400 to-violet-600 text-white shadow-xl shadow-purple-500/25"
                >
                  <Bot className="h-10 w-10" />
                </motion.div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] mb-3">
                  {STEP_TITLES['2'][lang]}
                </h1>
                <p className="text-sm lg:text-base text-[var(--color-text-tertiary)] max-w-lg mx-auto leading-relaxed">
                  {STEP_DESCRIPTIONS['2'][lang]}
                </p>
              </div>

              {/* AI Tutor preview card */}
              <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6 shadow-card mb-8">
                {/* Simulated chat */}
                <div className="space-y-4">
                  {/* AI bubble */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-violet-600 text-white shadow-md">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-[var(--color-surface-tertiary)] px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {lang === 'so'
                          ? 'Asc! Waxaan ahay Bare-haaga AI. Waxaan kaa caawin karaa fahamka casharada, ka jawaabista su\'aalaha, iyo xitaa kuu diyaarin karaa imtixaan yar yar.'
                          : lang === 'ar'
                            ? 'السلام عليكم! أنا معلمك الذكي. يمكنني مساعدتك في فهم الدروس والإجابة على أسئلتك وحتى إعداد اختبارات صغيرة لك.'
                            : 'As-salamu alaykum! I\'m your AI Tutor. I can help you understand lessons, answer questions, and even quiz you on what you\'ve learned.'}
                      </p>
                    </div>
                  </div>

                  {/* User bubble */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-white">
                        {lang === 'so'
                          ? 'Waan ku faraxsanahay inaan kula kulmo! Maxaan ku baran karaa maanta?'
                          : lang === 'ar'
                            ? 'سعيد بلقائك! ماذا يمكنني أن أتعلم اليوم؟'
                            : 'Nice to meet you! What can I learn today?'}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-bold">
                      U
                    </div>
                  </div>

                  {/* AI bubble */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-violet-600 text-white shadow-md">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-[var(--color-surface-tertiary)] px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {lang === 'so'
                          ? 'Wax kasta oo ku saabsan Diinta Islaamka! Fadlan ii sheeg mawduuca aad xiisaynayso — Tafsiirka, Fiqhiga, Siirada, ama Carabiga.'
                          : lang === 'ar'
                            ? 'كل ما يتعلق بالدين الإسلامي! أخبرني عن الموضوع الذي يثير اهتمامك — التفسير، الفقه، السيرة، أو العربية.'
                            : 'Anything about Islam! Tell me what topic you\'re interested in — Tafsir, Fiqh, Seerah, or Arabic.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature pills */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {[
                    { icon: '❓', label: lang === 'so' ? 'Su\'aalo' : lang === 'ar' ? 'أسئلة' : 'Ask Questions' },
                    { icon: '📖', label: lang === 'so' ? 'Sharaxaad' : lang === 'ar' ? 'شرح' : 'Get Explanations' },
                    { icon: '🧪', label: lang === 'so' ? 'Imtixaan' : lang === 'ar' ? 'اختبار' : 'Quiz Yourself' },
                    { icon: '🌍', label: lang === 'so' ? '3 Luuqadood' : lang === 'ar' ? '٣ لغات' : '3 Languages' },
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]"
                    >
                      {item.icon} {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom nav */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]">
                <button
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {lang === 'so' ? 'Dib' : lang === 'ar' ? 'السابق' : 'Back'}
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  {lang === 'so' ? 'Sii wad' : lang === 'ar' ? 'متابعة' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Start Your Journey ── */}
          {step === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/25"
                >
                  <Target className="h-10 w-10" />
                </motion.div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] mb-3">
                  {STEP_TITLES['3'][lang]}
                </h1>
                <p className="text-sm lg:text-base text-[var(--color-text-tertiary)] max-w-lg mx-auto leading-relaxed">
                  {STEP_DESCRIPTIONS['3'][lang]}
                </p>
              </div>

              {/* Checklist */}
              <div className="mx-auto max-w-sm space-y-3 mb-8">
                {[
                  {
                    icon: '📚',
                    text: lang === 'so' ? 'Koorsooyin dhameystiran oo Islaami ah ayaa diyaar kuu ah' : lang === 'ar' ? 'دورات إسلامية شاملة في انتظارك' : 'Full Islamic courses await you',
                  },
                  {
                    icon: '🤖',
                    text: lang === 'so' ? 'Bare AI oo 24/7 kaa caawinaya waxbarashadaada' : lang === 'ar' ? 'معلم ذكي ٢٤/٧ لمساعدتك في التعلم' : 'AI Tutor 24/7 to help you learn',
                  },
                  {
                    icon: '🏆',
                    text: lang === 'so' ? 'Hel XP, calaamado, oo kor u kac hogaanka' : lang === 'ar' ? 'اكسب النقاط والشارات وتسلق لوحة المتصدرين' : 'Earn XP, badges & climb the leaderboard',
                  },
                  {
                    icon: '📊',
                    text: lang === 'so' ? 'La soco horumarkaaga oo arko faahfaahinta waxbarashada' : lang === 'ar' ? 'تابع تقدمك وشاهد تحليلات التعلم' : 'Track your progress & see learning analytics',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-sm text-[var(--color-text-primary)]">{item.text}</p>
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 ms-auto" />
                  </motion.div>
                ))}
              </div>

              {/* Bottom nav */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {lang === 'so' ? 'Dib' : lang === 'ar' ? 'السابق' : 'Back'}
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  {lang === 'so' ? 'Bilow Waxbarashada!' : lang === 'ar' ? 'ابدأ التعلم!' : 'Start Learning!'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingWizard;