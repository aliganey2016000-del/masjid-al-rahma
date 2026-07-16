import { Router } from 'express';
import * as sidebarSettingController from '../../controllers/sidebar-setting.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminOnly, roleMiddleware } from '../../middleware/role.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';

const router = Router();

router.use(authMiddleware);

// Student portal reads its own org's effective settings.
router.get('/mine', roleMiddleware(['student']), asyncHandler(sidebarSettingController.getMine));

// Admin/org_admin manage settings — org_admin is always scoped to their own
// org inside the controller; admin must explicitly select an organization.
router.get('/', adminOnly, asyncHandler(sidebarSettingController.getForOrg));
router.put('/', adminOnly, asyncHandler(sidebarSettingController.update));

export default router;
