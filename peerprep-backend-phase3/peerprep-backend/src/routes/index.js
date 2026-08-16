import { Router } from 'express';

/**
 * Root API router — mounted in app.js at `/api/${API_VERSION}`.
 *
 * This is pure plumbing for this phase: a clean, versioned mount point that
 * future resource routers attach to, e.g. (added in later phases):
 *
 *   import authRouter from './auth.routes.js';
 *   import userRouter from './user.routes.js';
 *   router.use('/auth', authRouter);
 *   router.use('/users', userRouter);
 *
 * Nothing is mounted yet — no resource route modules exist until Phase 7+
 * (Authentication) and onward. Keeping this file as the single aggregation
 * point means app.js never needs to know about individual resource routers.
 */
const router = Router();

export default router;
