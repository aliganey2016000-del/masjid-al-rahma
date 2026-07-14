/**
 * Fix Org Admin — "tusmo" organization
 *
 * The org_admin sync hook (school.controller.ts create()) failed silently
 * for this specific organization before that path had try/catch error
 * logging, leaving the school registered with no matching login account.
 * This script finds the "tusmo" school by its registered email and
 * creates/repairs the matching org_admin user (email + phone-as-password,
 * hashed once via the model's pre-save hook).
 *
 * Run: npx ts-node src/scripts/fix-tusmo-org-admin.ts
 */
export {};
//# sourceMappingURL=fix-tusmo-org-admin.d.ts.map