import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import { HTTP_STATUS } from './constants.js';

const app = express();

/**
 * ─────────────────────────────────────────────────────────────
 * Security & core middleware
 * ─────────────────────────────────────────────────────────────
 * Order matters here:
 *  1. helmet first        — sets security headers before anything else runs
 *  2. cors                — controls which origins may even reach the app
 *  3. rate limiter         — rejects abusive traffic before it hits body parsing
 *  4. body/cookie parsers — only parse payloads for requests that passed 1-3
 *  5. compression          — compress what actually gets sent back
 *  6. morgan (dev logging) — log after the pipeline is fully assembled
 *
 * Note: this is the global, app-wide security baseline. Endpoint-specific
 * concerns (auth guards, input validation, mongo-sanitize, xss stripping,
 * per-route stricter rate limits) belong in src/middlewares/ and are wired
 * in per-router in later phases — keeping them out of app.js keeps this
 * file readable as "the whole pipeline at a glance."
 */

app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
app.use(globalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());

if (!env.isProduction && !env.isTest) {
  app.use(morgan('dev'));
}

/**
 * ─────────────────────────────────────────────────────────────
 * Health check
 * ─────────────────────────────────────────────────────────────
 * Used by Docker healthchecks / uptime monitors (Phase 16) — deliberately has
 * no auth, no DB dependency, so it reflects "is the process alive" only.
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
 * API routes
 * ─────────────────────────────────────────────────────────────
 * Resource routers are mounted here in later phases, e.g.:
 *   app.use(`/api/${env.apiVersion}/auth`, authRouter);
 * Left unmounted for now — no route modules exist yet at this phase.
 */

/**
 * ─────────────────────────────────────────────────────────────
 * 404 handler — must come after all real routes
 * ─────────────────────────────────────────────────────────────
 */
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/**
 * ─────────────────────────────────────────────────────────────
 * Baseline error handler
 * ─────────────────────────────────────────────────────────────
 * This is a minimal safety net so the app never leaks a raw stack trace to a
 * client even before Phase 5 exists. The full centralized error-handling
 * middleware (AppError class, catchAsync wrapper, dev vs prod error shape)
 * is built in Phase 5 and will replace this handler.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (!env.isProduction) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
