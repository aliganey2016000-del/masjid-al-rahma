import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../store/auth-context';
import api from '../../../lib/axios';

interface DashboardData {
  studentId: string;
  status: string;
  coursesCount: number;
  attendancePercentage: number;
  gpa: number;
  totalFeesPaid: number;
  totalFeesDue: number;
  totalFees: number;
  discount: number;
  profile?: { _id: string; firstName: string; lastName: string; avatar?: string; gender: string };
  school?: { _id: string; name: string; logo?: string };
  enrolledCourses: { _id: string; title: { en: string; so: string; ar: string }; slug: string; category: string; level: string; status: string; thumbnail?: string }[];
}

export function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const lang = i18n.language as 'en' | 'so' | 'ar';

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get('/students/my/dashboard');
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || t('common.error_occurred'));
      } finally { setLoading(false); }
    })();
  }, [t]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
        <p className="text-sm text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm text-white hover:bg-emerald-700 transition-colors">
          {t('retry')}
        </button>
      </div>
    </div>
  );
  if (!data) return null;

  const fullName = data.profile
    ? `${data.profile.firstName} ${data.profile.lastName}`.trim()
    : (user?.email || 'Student');
  const firstName = data.profile?.firstName || fullName.split(' ')[0] || 'Student';
  const schoolName = data.school?.name || 'Masjid Al-Rahma Institute';
  const schoolInitial = schoolName.charAt(0).toUpperCase();

  // Dynamic date
  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang === 'so' ? 'so-SO' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const getTitle = (course: any) => {
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

  const getCatLabel = (cat: string) => {
    if (lang === 'so') return catLabels[cat]?.so || cat;
    if (lang === 'ar') return catLabels[cat]?.ar || cat;
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const navItems = [
    { to: '/student/courses', label: t('my_courses'), icon: '📚', color: 'from-blue-500/20 to-blue-600/10 border-blue-200/50 dark:border-blue-800/50' },
    { to: '/student/attendance', label: t('attendance'), icon: '📅', color: 'from-green-500/20 to-green-600/10 border-green-200/50 dark:border-green-800/50' },
    { to: '/student/exams', label: t('exams'), icon: '📝', color: 'from-purple-500/20 to-purple-600/10 border-purple-200/50 dark:border-purple-800/50' },
    { to: '/student/certificates', label: t('certificates'), icon: '🏆', color: 'from-amber-500/20 to-amber-600/10 border-amber-200/50 dark:border-amber-800/50' },
    { to: '/student/schedule', label: lang === 'so' ? 'Jadwalka' : lang === 'ar' ? 'الجدول' : 'Schedule', icon: '🕐', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-200/50 dark:border-cyan-800/50' },
    { to: '/student/available', label: lang === 'so' ? 'Raadi Koorso' : lang === 'ar' ? 'تصفح الدورات' : 'Browse Courses', icon: '🔍', color: 'from-rose-500/20 to-rose-600/10 border-rose-200/50 dark:border-rose-800/50' },
  ];

  // Fees progress
  const feesPaidPercent = data.totalFees > 0 ? Math.round((data.totalFeesPaid / data.totalFees) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface-primary)]">
      {/* ── Organization Header Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900">
        {/* Abstract background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-8 lg:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* School Logo/Avatar */}
            <div className="flex-shrink-0 flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
              {data.school?.logo ? (
                <img src={data.school.logo} alt={schoolName} className="h-10 w-10 object-contain" />
              ) : (
                <span className="text-xl lg:text-2xl font-bold text-emerald-300">{schoolInitial}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-1">
                {lang === 'so' ? 'Xarunta Waxbarashada' : lang === 'ar' ? 'المنظمة التعليمية' : 'Learning Organization'}
              </p>
              <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight">{schoolName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">
              {lang === 'so' ? 'Firfircoon' : lang === 'ar' ? 'نشط' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Dashboard Content ── */}
      <div className="mx-auto max-w-6xl px-6 -mt-6 space-y-6 pb-12">
        {/* ── Welcome Hero ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-surface-primary)] to-emerald-50 dark:to-emerald-950/30 border border-[var(--color-border-default)] shadow-card p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">{dateStr}</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
                {lang === 'so' ? 'Ku soo dhawoow' : lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'},{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{firstName}</span>
                <span className="ml-1">👋</span>
              </h1>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                {fullName} · <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-300">{data.studentId}</span>
              </p>
            </div>
            <Link
              to="/student/courses"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-emerald-600/40 transition-all active:scale-95"
            >
              {lang === 'so' ? 'Sii wad waxbarashada' : lang === 'ar' ? 'مواصلة التعلم' : 'Continue Learning'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon="📚"
            label={lang === 'so' ? 'Koorsooyin La Qaatay' : lang === 'ar' ? 'الدورات المسجلة' : 'Enrolled Courses'}
            value={data.coursesCount}
            sub={lang === 'so' ? 'koorso' : lang === 'ar' ? 'دورة' : 'courses'}
            gradient="from-blue-500 to-blue-600"
            bgGradient="from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20"
            iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          />
          <MetricCard
            icon="📅"
            label={lang === 'so' ? 'Xaadiritaan' : lang === 'ar' ? 'الحضور' : 'Attendance'}
            value={`${data.attendancePercentage || 0}%`}
            sub={data.attendancePercentage >= 75 ? (lang === 'so' ? 'Wanaagsan' : lang === 'ar' ? 'جيد' : 'Good') : (lang === 'so' ? 'Hagaaji' : lang === 'ar' ? 'تحسين' : 'Needs Work')}
            gradient="from-green-500 to-emerald-600"
            bgGradient="from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20"
            iconBg="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
          />
          <MetricCard
            icon="📊"
            label={lang === 'so' ? 'GPA' : lang === 'ar' ? 'المعدل' : 'GPA'}
            value={data.gpa > 0 ? data.gpa.toFixed(1) : '—'}
            sub={data.gpa >= 3.5 ? (lang === 'so' ? 'Heer Sare' : lang === 'ar' ? 'ممتاز' : 'Excellent') : data.gpa >= 2.5 ? (lang === 'so' ? 'Wanaagsan' : lang === 'ar' ? 'جيد' : 'Good') : ''}
            gradient="from-purple-500 to-violet-600"
            bgGradient="from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20"
            iconBg="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
          />
          <MetricCard
            icon="💰"
            label={lang === 'so' ? 'Lacagaha Bixinta' : lang === 'ar' ? 'الرسوم المستحقة' : 'Fees Due'}
            value={data.totalFeesDue > 0 ? `$${data.totalFeesDue.toLocaleString()}` : (lang === 'so' ? 'Ma jiraan' : lang === 'ar' ? 'لا يوجد' : 'None')}
            sub={
              data.totalFees > 0
                ? `${feesPaidPercent}% paid`
                : (lang === 'so' ? 'Wali lama dalacin' : lang === 'ar' ? 'لم تحدد بعد' : 'Not set yet')
            }
            gradient="from-red-500 to-rose-600"
            bgGradient={data.totalFeesDue > 0 ? 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20' : 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20'}
            iconBg={data.totalFeesDue > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'}
          />
        </div>

        {/* ── Quick Links ── */}
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            {lang === 'so' ? 'Xiriiriyaha Degdegga ah' : lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${item.color} backdrop-blur-sm p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95`}
              >
                <div className="relative z-10">
                  <span className="text-3xl block mb-2 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.label}</span>
                </div>
                <div className="absolute inset-0 bg-white/30 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Enrolled Courses ── */}
        {data.enrolledCourses.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {lang === 'so' ? 'Koorsooyinkayga' : lang === 'ar' ? 'دوراتي' : 'My Courses'}
              </h2>
              <Link to="/student/courses" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                {lang === 'so' ? 'Dhammaan Eeg →' : lang === 'ar' ? 'عرض الكل ←' : 'View All →'}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.enrolledCourses.slice(0, 6).map(c => (
                <Link
                  key={c._id}
                  to={`/student/courses/${c._id}`}
                  className="group rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200"
                >
                  <p className="font-semibold text-sm text-[var(--color-text-primary)] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {getTitle(c)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      {getCatLabel(c.category)}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)] capitalize">
                      {c.level}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {data.enrolledCourses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-12 text-center">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              {lang === 'so' ? 'Weli koorsooyin kama qaadan' : lang === 'ar' ? 'لم تسجل في أي دورة بعد' : 'No courses enrolled yet'}
            </p>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
              {lang === 'so' ? 'Raadi koorsooyinka diyaarka ah oo isqor hadda' : lang === 'ar' ? 'تصفح الدورات المتاحة وسجل الآن' : 'Browse available courses and enroll now'}
            </p>
            <Link
              to="/student/available"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {lang === 'so' ? '🔍 Raadi Koorsooyin' : lang === 'ar' ? '🔍 تصفح الدورات' : '🔍 Browse Courses'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Premium Metric Card ──
function MetricCard({ icon, label, value, sub, gradient, bgGradient, iconBg }: {
  icon: string; label: string; value: string | number; sub?: string;
  gradient: string; bgGradient: string; iconBg: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-gradient-to-br ${bgGradient} p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}>
      {/* Hover glow */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg} text-xl shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-xs font-medium text-[var(--color-text-tertiary)] truncate">{label}</p>
          {sub && <p className="text-[10px] text-[var(--color-text-tertiary)]/70 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;