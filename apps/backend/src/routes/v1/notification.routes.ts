import { Router } from 'express';
import * as ctrl from '../../controllers/notification.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminOnly } from '../../middleware/role.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';

const router = Router();
router.use(authMiddleware);

// Self-service — any authenticated role. The controller already scopes every
// query to req.user!.userId, so this is never cross-user regardless of role.
router.get('/my', asyncHandler(ctrl.getMyNotifications));
router.patch('/read-all', asyncHandler(ctrl.markAllRead));
router.patch('/:id/read', asyncHandler(ctrl.markAsRead));
router.delete('/:id', asyncHandler(ctrl.remove));

// Admin can create notifications
router.post('/', adminOnly, asyncHandler(ctrl.create));

export default router;