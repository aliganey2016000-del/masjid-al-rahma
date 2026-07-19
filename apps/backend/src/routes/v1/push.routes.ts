import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { getPublicKey, subscribe, unsubscribe } from '../../controllers/push.controller';

const router = Router();

router.get('/vapid-public-key', asyncHandler(getPublicKey));

router.use(authMiddleware);
router.post('/subscribe', asyncHandler(subscribe));
router.post('/unsubscribe', asyncHandler(unsubscribe));

export default router;
