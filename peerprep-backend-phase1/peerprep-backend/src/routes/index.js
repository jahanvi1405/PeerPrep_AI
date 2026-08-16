import { Router } from 'express';

import authRouter from './authRoutes.js';

/**
 * Root API router — mounted in app.js at `/api/${API_VERSION}`.
 *
 * Resource routers attach here, one per line, e.g.:
 *
 *   import userRouter from './userRoutes.js';
 *   router.use('/users', userRouter);
 *
 * Phase 7 (Authentication) is the first resource router mounted. No
 * business logic lives in this file — only aggregation.
 */
const router = Router();

router.use('/auth', authRouter);

export default router;
