/**
 * Tenant Middleware — Multi-Tenant Subdomain Resolution
 *
 * Extracts the subdomain from the request `Host` header, looks up the
 * corresponding organization, and attaches it to `req.tenant`.
 *
 * Behavior:
 *   - localhost / IP address / root domain / www → no tenant (main site)
 *   - Valid subdomain → attaches `req.tenant` with { slug, name, branding }
 *   - Invalid / unknown subdomain → returns 404 JSON error
 *
 * This middleware should be applied globally so every route can access
 * `req.tenant` to provide tenant-scoped behavior or branding.
 */

import { Request, Response, NextFunction } from 'express';
import School, { TenantBranding } from '../models/school.model';
import ApiResponse from '../utils/api-response';

// ---------------------------------------------------------------------------
// Augment Express Request
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantBranding | null;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Resolves the current tenant from the Host header.
 *
 * - On localhost / IP / root domain / www: `req.tenant` is set to `null`
 *   (main marketing site — no tenant-specific behavior).
 * - On a recognized active subdomain: `req.tenant` is populated.
 * - On an unrecognized subdomain: returns a 404 JSON error.
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // The frontend's nginx proxies /api/ to this backend's public URL (they
    // are separate Coolify apps with no shared Docker network), which means
    // the Host header nginx sends must stay api.sahaledu.com so Coolify's
    // edge proxy routes the request here. The real tenant subdomain the
    // visitor requested travels in X-Forwarded-Host instead.
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();

    // Fast-path: localhost or IP → main site (no tenant lookup)
    const hostname = host.replace(/:\d+$/, '');
    if (
      hostname === 'localhost' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
      req.tenant = null;
      return next();
    }

    const parts = hostname.split('.');

    // Single-part host or only two parts (e.g. example.com) → main site
    if (parts.length <= 2) {
      req.tenant = null;
      return next();
    }

    const subdomain = parts[0].toLowerCase();

    // www → main site
    if (subdomain === 'www') {
      req.tenant = null;
      return next();
    }

    // Look up tenant by slug or subdomain
    const tenant = await School.findBySubdomain(host);

    if (!tenant) {
      // Unknown subdomain — return 404
      ApiResponse.error(
        res,
        404,
        'Portal not found. The organization you are trying to reach does not exist or has been deactivated.'
      );
      return; // void return — response already sent
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

export default tenantMiddleware;