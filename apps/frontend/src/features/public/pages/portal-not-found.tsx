/**
 * Portal Not Found Page
 *
 * Shown when the user navigates to a subdomain that doesn't match any
 * active tenant in the system. Provides a clear, elegant message with
 * a link back to the main site.
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../../../store/tenant-context';

export function PortalNotFoundPage() {
  const { subdomain, error } = useTenant();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-obsidian-950 dark:to-obsidian-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg text-center"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <svg
            className="h-10 w-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Portal Not Found
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {error || (
            <>
              The organization portal{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {subdomain}
              </span>{' '}
              does not exist or has been deactivated.
            </>
          )}
        </p>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          If you believe this is an error, please contact support or check the
          URL and try again.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://${window.location.hostname.replace(/^[^.]+\./, '')}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Go to Main Site
          </a>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-obsidian-800 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-50 dark:hover:bg-obsidian-700 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default PortalNotFoundPage;