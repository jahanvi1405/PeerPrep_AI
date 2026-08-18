import { Router } from 'express';

import authRouter from './authRoutes.js';
import profileRouter from './profileRoutes.js';
import skillRouter from './skillRoutes.js';
import sessionRouter from './sessionRoutes.js';

/**
 * Root API router — mounted in app.js at `/api/${API_VERSION}`.
 *
 * Resource routers attach here, one per line. No business logic lives in
 * this file — only aggregation.
 */
const router = Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/skills', skillRouter);
router.use('/sessions', sessionRouter);

export default router;
