/**
 * Global Search Bar — searches Courses + Assignments across the app.
 *
 * Debounced query to GET /search?q=..., dropdown grouped by result kind,
 * keyboard navigation (Up/Down/Enter/Escape), click-outside to close.
 * Result target route depends on the user's role (student portal has
 * per-item detail pages; admin/teacher/org_admin land on the closest
 * equivalent management page).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/axios';
import { useAuth } from '../../../store/auth-context';

interface SearchResult {
  id: string;
  kind: 'course' | 'assignment';
  title: string;
  subtitle?: string;
  courseId?: string;
  enrolled?: boolean;
}

function resultHref(role: string, item: SearchResult): string | null {
  if (item.kind === 'course') {
    // The student course-detail page only resolves enrolled courses — for a
    // course the student hasn't joined yet, send them to the browse/enroll
    // page instead of a route that will 404.
    if (role === 'student') return item.enrolled ? `/student/courses/${item.id}` : '/student/available';
    if (['admin', 'org_admin', 'teacher'].includes(role)) return `/admin/courses/${item.id}/builder`;
    return null;
  }
  if (item.kind === 'assignment') {
    if (role === 'student') return `/student/assignments/${item.id}`;
    if (['admin', 'org_admin', 'teacher'].includes(role)) return `/admin/assignments`;
    return null;
  }
  return null;
}

export function GlobalSearchBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<SearchResult[]>([]);
  const [assignments, setAssignments] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatResults = [...courses, ...assignments];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setCourses([]);
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q } });
        setCourses(data.data?.courses || []);
        setAssignments(data.data?.assignments || []);
        setActiveIndex(-1);
      } catch {
        setCourses([]);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function goTo(item: SearchResult) {
    const role = user?.role || '';
    const href = resultHref(role, item);
    setOpen(false);
    setQuery('');
    if (href) navigate(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      goTo(flatResults[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search courses, assignments…"
          className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          aria-label="Global search"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] shadow-xl overflow-hidden max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">Searching…</div>
          )}
          {!loading && flatResults.length === 0 && (
            <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No results found</div>
          )}
          {!loading && courses.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Courses
              </div>
              {courses.map((c) => {
                const idx = flatResults.indexOf(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => goTo(c)}
                    className={`flex w-full flex-col items-start px-4 py-2 text-left transition-colors ${
                      idx === activeIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-[var(--color-surface-secondary)]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{c.title}</span>
                    {c.subtitle && <span className="text-xs text-[var(--color-text-tertiary)]">{c.subtitle}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {!loading && assignments.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Assignments
              </div>
              {assignments.map((a) => {
                const idx = flatResults.indexOf(a);
                return (
                  <button
                    key={a.id}
                    onClick={() => goTo(a)}
                    className={`flex w-full flex-col items-start px-4 py-2 text-left transition-colors ${
                      idx === activeIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-[var(--color-surface-secondary)]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{a.title}</span>
                    {a.subtitle && <span className="text-xs text-[var(--color-text-tertiary)]">{a.subtitle}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearchBar;
