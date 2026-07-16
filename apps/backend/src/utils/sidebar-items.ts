/**
 * Canonical registry of student-sidebar items that an org can show/hide via
 * the Sidebar Settings manager. Keep this in sync with the frontend's
 * student-sidebar nav config (apps/frontend/src/features/student/components/student-sidebar.tsx)
 * — the `key` values here are the source of truth the frontend filters by.
 *
 * The dashboard home link and Logout are intentionally excluded: they must
 * always remain visible regardless of tenant configuration.
 */

export interface SidebarItemDef {
  key: string;
  label: string;
  section: string;
}

export const STUDENT_SIDEBAR_ITEMS: SidebarItemDef[] = [
  { key: 'student/courses', label: 'My Courses', section: 'Learning' },
  { key: 'student/available', label: 'Browse Courses', section: 'Learning' },
  { key: 'student/assignments', label: 'Assignments', section: 'Learning' },
  { key: 'student/downloads', label: 'Downloads', section: 'Learning' },

  { key: 'group:exams', label: 'Exams (entire menu)', section: 'Performance' },
  { key: 'student/exams', label: 'My Exam Schedule', section: 'Performance' },
  { key: 'student/exams/seating', label: 'Seat & Hall Allocation', section: 'Performance' },
  { key: 'student/exams/active', label: 'Active Exams', section: 'Performance' },
  { key: 'student/exams/attendance', label: 'Attendance History', section: 'Performance' },
  { key: 'student/exams/results', label: 'Exam Results & Grades', section: 'Performance' },
  { key: 'student/exams/appeals', label: 'Academic Appeals', section: 'Performance' },
  { key: 'student/attendance', label: 'Attendance', section: 'Performance' },
  { key: 'student/certificates', label: 'Certificates', section: 'Performance' },
  { key: 'student/bookmarks', label: 'Bookmarks', section: 'Performance' },

  { key: 'student/forum', label: 'Forum', section: 'Communication' },

  { key: 'student/notifications', label: 'Notifications', section: 'Account' },
  { key: 'student/profile', label: 'Profile', section: 'Account' },
  { key: 'student/settings', label: 'Settings', section: 'Account' },
];

export const STUDENT_SIDEBAR_ITEM_KEYS = new Set(STUDENT_SIDEBAR_ITEMS.map((i) => i.key));

/** Merges an org's stored overrides onto the full item registry (default: visible). */
export function mergeSidebarOverrides(overrides: { key: string; visible: boolean }[]) {
  const overrideMap = new Map(overrides.map((o) => [o.key, o.visible]));
  return STUDENT_SIDEBAR_ITEMS.map((item) => ({
    ...item,
    visible: overrideMap.has(item.key) ? !!overrideMap.get(item.key) : true,
  }));
}
