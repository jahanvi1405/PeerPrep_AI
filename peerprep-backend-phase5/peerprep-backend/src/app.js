import express from 'express';

import env from './config/env.js';
import { HTTP_STATUS } from './constants.js';
import registerGlobalMiddleware from './middlewares/globalMiddleware.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

/**
 * Global middleware pipeline (helmet, cors, rate limiting, body parsing,
 * mongo-sanitize, hpp, compression, dev logging) — centralized in
 * src/middlewares/globalMiddleware.js so this file stays readable as
 * "assemble app → mount routes → handle errors" rather than a long list
 * of app.use() calls.
 */
registerGlobalMiddleware(app);

/**
 * ─────────────────────────────────────────────────────────────
 * Health check
 * ─────────────────────────────────────────────────────────────
 * Used by Docker healthchecks / uptime monitors (Phase 16) — deliberately
 * mounted before the versioned API router and with no DB dependency, so it
 * reflects "is the process alive" only, independent of MongoDB (Phase 2)
 * or any future auth/rate-limit changes scoped to /api.
 */
app.get('/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'PeerPrep AI API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * ─────────────────────────────────────────────────────────────
 * Versioned API routes
 * ─────────────────────────────────────────────────────────────
 * Mounted at /api/{API_VERSION} (from env.apiVersion, default "v1"). The
 * router itself is currently empty — resource routers (auth, users, skills,
 * sessions, ...) attach to it starting in later phases. No business logic
 * lives in this file or in routes/index.js.
 */
app.use(`/api/${env.apiVersion}`, apiRouter);

/**
 * ─────────────────────────────────────────────────────────────
 * 404 + centralized error handling — must be mounted last
 * ─────────────────────────────────────────────────────────────
 */
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
