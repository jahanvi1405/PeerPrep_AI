import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import env from '../config/env.js';

/**
 * Centralized global middleware pipeline.
 *
 * Every app-wide (non-route-specific) middleware lives here, in one place,
 * in one deliberate order, so app.js stays readable as "assemble app, mount
 * routes, handle errors" instead of a 15-line wall of app.use() calls.
 *
 * Order (and why):
 *   1. helmet            — security headers, before anything else runs
 *   2. cors               — reject/allow origins before any real work happens
 *   3. rate limiter        — throttle abusive traffic before body parsing cost
 *   4. body/cookie parsers — parse only what passed 1-3
 *   5. mongo-sanitize       — strip NoSQL-injection operators ($, .) from
 *                             req.body/req.query/req.params — must run AFTER
 *                             parsing, since there's nothing to sanitize before
 *   6. hpp                  — collapse HTTP Parameter Pollution (?role=a&role=b)
 *                             on req.query — also needs parsing to have happened
 *   7. compression          — compress the outgoing response
 *   8. morgan (dev only)    — log once the real pipeline is fully assembled
 *
 * Endpoint-specific middleware (auth guards, Joi validation, per-route
 * stricter rate limits) is intentionally NOT here — those are wired directly
 * into individual routers starting in Phase 7, so this file stays a stable
 * "foundation" that later phases build on top of rather than edit.
 */
export default function registerGlobalMiddleware(app) {
  app.use(helmet());

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
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

  app.use(mongoSanitize());
  app.use(hpp());

  app.use(compression());

  if (!env.isProduction && !env.isTest) {
    app.use(morgan('dev'));
  }
}
