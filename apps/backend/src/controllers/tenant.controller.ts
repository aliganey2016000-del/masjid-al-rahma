/**
 * Tenant Controller
 *
 * Public endpoints for tenant branding lookups.
 * No authentication required — used by the frontend for dynamic theming
 * based on the subdomain/slug.
 */

import { Request, Response } from 'express';
import School from '../models/school.model';
import ApiResponse from '../utils/api-response';
import { BadRequestError, NotFoundError } from '../utils/api-error';

// ---------------------------------------------------------------------------
// GET /api/v1/tenant/:slug/branding — Public branding by slug
// ---------------------------------------------------------------------------

export const getBrandingBySlug = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;

  if (!slug || slug.length < 3) {
    throw new BadRequestError('Slug must be at least 3 characters');
  }

  const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!SLUG_REGEX.test(slug)) {
    throw new BadRequestError('Slug may only contain lowercase letters, numbers, and hyphens');
  }

  const school = await School.findOne({ slug, status: 'active' })
    .select('slug name organizationType branding')
    .lean();

  if (!school) {
    throw new NotFoundError('Organization not found');
  }

  return ApiResponse.success(res, {
    slug: school.slug,
    name: school.name,
    organizationType: school.organizationType,
    branding: school.branding || {},
    portalUrl: `${school.slug}.${process.env.BASE_DOMAIN || 'sahaledu.com'}`,
  });
};

// ---------------------------------------------------------------------------
// GET /api/v1/tenant/current — Resolve from Host header
// ---------------------------------------------------------------------------

export const getCurrentBranding = async (req: Request, res: Response): Promise<Response> => {
  if (!req.tenant) {
    // No tenant detected in host header (root / www / localhost)
    return ApiResponse.success(res, {
      isMainSite: true,
      name: 'Sahal Education Platform',
      branding: {
        logo: '',
        themeColor: '#0d9488',
      },
    });
  }

  return ApiResponse.success(res, {
    isMainSite: false,
    ...req.tenant,
    portalUrl: `${process.env.BASE_DOMAIN || 'sahaledu.com'}`,
  });
};