/**
 * Search Routes — /api/v1/search
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { search } from '../../controllers/search.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(search));

export default router;
