"use strict";
/**
 * School Routes
 *
 * Mounted at /api/v1/schools
 * All routes require authentication. Write operations are admin-only.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ctrl = __importStar(require("../../controllers/school.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const async_handler_middleware_1 = require("../../middleware/async-handler.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// ── Read (admin, org_admin, or teacher — results scoped to own org inside the controller for org_admin) ──
router.get('/', role_middleware_1.adminOrTeacher, (0, async_handler_middleware_1.asyncHandler)(ctrl.getAll));
router.get('/:id', role_middleware_1.adminOrTeacher, (0, async_handler_middleware_1.asyncHandler)(ctrl.getById));
// ── Update own org info (admin, or org_admin for their own organization only) ──
router.patch('/:id', role_middleware_1.adminOnly, (0, async_handler_middleware_1.asyncHandler)(ctrl.update));
// ── Registering new organizations, activation/deactivation, and deletion are
//    super-admin only — an org_admin must never create another tenant,
//    suspend their own org, or delete organizations. ──
router.post('/', (0, role_middleware_1.roleMiddleware)(['admin']), (0, async_handler_middleware_1.asyncHandler)(ctrl.create));
router.patch('/:id/status', (0, role_middleware_1.roleMiddleware)(['admin']), (0, async_handler_middleware_1.asyncHandler)(ctrl.updateStatus));
router.delete('/:id', (0, role_middleware_1.roleMiddleware)(['admin']), (0, async_handler_middleware_1.asyncHandler)(ctrl.remove));
exports.default = router;
//# sourceMappingURL=school.routes.js.map