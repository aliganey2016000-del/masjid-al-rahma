/**
 * Tenant Scope Helpers — multi-tenant data isolation for org_admin.
 *
 * Super admin (`admin`) and `teacher` see everything, unscoped. `org_admin`
 * must only ever see/modify records belonging to their own organization
 * (`req.user.organizationId`, embedded in the JWT at login).
 *
 * Usage:
 *   const filter = applyOrgFilter(req, { status: 'active' }, 'school');
 *   const students = await Student.find(filter);
 *
 *   const doc = await Student.findById(id);
 *   assertOwnsOrg(req, doc, 'school'); // throws ForbiddenError if mismatched
 */
import { Request } from 'express';
/**
 * Returns a copy of `filter` with the tenant field constrained to the
 * caller's own organization when they are `org_admin`. Admin/teacher get
 * the filter back unchanged (full cross-tenant visibility).
 *
 * Matches the org_admin's own org OR records with no org assigned yet
 * (e.g. a self-registered student pending approval) — those aren't another
 * tenant's data, they're unclaimed, and an org_admin must still be able to
 * see and claim them into their own organization.
 */
export declare function applyOrgFilter<T extends Record<string, unknown>>(req: Request, filter: T, field?: string): T;
/**
 * Throws ForbiddenError if the caller is `org_admin` and the given document
 * belongs to a DIFFERENT organization. A document with no org assigned yet
 * is treated as unclaimed, not another tenant's — org_admin may act on it
 * (e.g. approving a pending student into their own org). No-op for
 * admin/teacher, and for a null/undefined document (let the caller's own
 * NotFoundError handle that).
 */
export declare function assertOwnsOrg(req: Request, doc: any, field?: string): void;
/**
 * For create endpoints: returns the organizationId an org_admin's new
 * record must be stamped with, overriding anything the client sent.
 * Returns the client-provided value unchanged for admin/teacher.
 */
export declare function resolveOrgIdForCreate(req: Request, clientProvidedValue?: unknown): unknown;
//# sourceMappingURL=tenant-scope.d.ts.map