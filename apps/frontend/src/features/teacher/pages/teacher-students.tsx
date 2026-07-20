/**
 * Teacher Students — My Students Overview
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Search, Star, Zap, AlertCircle } from 'lucide-react';
import api from '../../../lib/axios';

export function TeacherStudents() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'so' | 'ar';
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/teacher-portal/dashboard/gamification');
        setStudents(data.data?.topStudents || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-6">
        {lang === 'so' ? 'Ardaydeyda' : 'My Students'}
      </h1>
      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-sm text-red-600">{error}</p></div>}
      <div className="space-y-3">
        {students.map((s: any, idx) => (
          <motion.div key={s.studentId || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-bold text-sm">
              {s.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-amber-600 flex items-center gap-1"><Zap className="h-3 w-3" /> {s.xp} XP</span>
                <span className="text-xs text-purple-600">Lv.{s.level}</span>
                {s.streak > 0 && <span className="text-xs text-orange-500">🔥{s.streak}</span>}
              </div>
            </div>
            {s.badges?.length > 0 && (
              <div className="flex gap-1">{s.badges.slice(0, 3).map((b: string, bi: number) => <span key={bi} title={b}>🏅</span>)}</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default TeacherStudents;