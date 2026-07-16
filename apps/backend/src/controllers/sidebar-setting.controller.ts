/**
 * Sidebar Setting Controller
 * Tenant-scoped show/hide configuration for the student portal sidebar.
 */

import { Request, Response } from 'express';
import SidebarSetting from '../models/sidebar-setting.model';
import ApiResponse from '../utils/api-response';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/api-error';
import { STUDENT_SIDEBAR_ITEM_KEYS, mergeSidebarOverrides } from '../utils/sidebar-items';
import ensureStudentRecord from '../utils/ensure-student';

/**
 * Resolves which organization the caller may read/write settings for.
 *   - org_admin: always their own org — a school id in the query/body is
 *     ignored so they can never widen scope to another tenant.
 *   - admin: must explicitly pick an org (query ?school= / body.school) —
 *     there is no "global" sidebar-settings document, by design.
 */
function resolveTargetSchool(req: Request, provided?: unknown): string {
  if (req.user?.role === 'org_admin') {
    if (!req.user.organizationId) throw new ForbiddenError('Your account is not linked to an organization.');
    return req.user.organizationId;
  }
  // admin
  const schoolId = (provided as string) || undefined;
  if (!schoolId) throw new BadRequestError('school is required — select an organization first.');
  return schoolId;
}

// GET /sidebar-settings?school=<id>  (org_admin ignores the query, uses own org)
export const getForOrg = async (req: Request, res: Response): Promise<Response> => {
  const school = resolveTargetSchool(req, req.query.school);

  const setting = await SidebarSetting.findOne({ school, portal: 'student' }).lean();
  const items = mergeSidebarOverrides(setting?.items || []);

  return ApiResponse.success(res, { school, items });
};

// PUT /sidebar-settings  { school?, items: [{ key, visible }] }
export const update = async (req: Request, res: Response): Promise<Response> => {
  const school = resolveTargetSchool(req, req.body.school);
  const { items } = req.body as { items: { key: string; visible: boolean }[] };

  if (!Array.isArray(items)) throw new BadRequestError('items must be an array');
  for (const item of items) {
    if (!STUDENT_SIDEBAR_ITEM_KEYS.has(item.key)) {
      throw new BadRequestError(`Unknown sidebar item key "${item.key}"`);
    }
    if (typeof item.visible !== 'boolean') {
      throw new BadRequestError(`visible must be a boolean for "${item.key}"`);
    }
  }

  const setting = await SidebarSetting.findOneAndUpdate(
    { school, portal: 'student' },
    { school, portal: 'student', items, updatedBy: req.user!.userId },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return ApiResponse.success(res, { school, items: mergeSidebarOverrides(setting!.items) }, 'Sidebar settings saved');
};

// GET /sidebar-settings/mine — effective settings for the caller's own org (student portal)
export const getMine = async (req: Request, res: Response): Promise<Response> => {
  const student = await ensureStudentRecord(req.user!.userId);
  const school = (student as any).school;
  if (!school) throw new NotFoundError('Organization for this student');

  const setting = await SidebarSetting.findOne({ school, portal: 'student' }).lean();
  const items = mergeSidebarOverrides(setting?.items || []);

  return ApiResponse.success(res, { items });
};
