/**
 * Admin Route Guard — Ensures only admin/org_admin can access /admin routes.
 *
 * Teachers who manually type /admin/* URLs or have stale cached layouts are
 * immediately evicted to their sandboxed /teacher portal.
 * Students and parents are likewise redirected to their appropriate portals.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/auth-context';

const ROLE_PORTAL: Record<string, string> = {
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }
    if (user.role !== 'admin' && user.role !== 'org_admin') {
      const redirect = ROLE_PORTAL[user.role] || '/auth/login';
      navigate(redirect, { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || (user.role !== 'admin' && user.role !== 'org_admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[var(--color-border-default)] border-t-primary-600" />
          <p className="text-sm text-[var(--color-text-tertiary)]">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AdminGuard;