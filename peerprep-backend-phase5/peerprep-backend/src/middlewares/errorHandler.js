import env from '../config/env.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * 404 handler for any request that didn't match a real route.
 * Must be mounted after every route/router — Express matches middleware
 * top-to-bottom, so anything not caught above falls through to this.
 */
export function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
}

/**
 * Global error handler — the final safety net in the pipeline.
 *
 * Deliberately minimal at this phase: it reads `err.statusCode` if present
 * and otherwise falls back to 500, and never leaks a raw stack trace to the
 * client in production. It does NOT (yet):
 *   - distinguish operational errors from programmer bugs
 *   - use an AppError class
 *   - format validation errors specially
 *   - provide a catchAsync wrapper for async route handlers
 * That full system is explicitly Phase 5 (Middlewares) / Phase 6 (Utilities)
 * scope. This handler exists now purely so nothing in the Phase 1-3
 * foundation can leak internals — later phases replace the internals of
 * this function, not its position in the pipeline.
 *
 * Note on async routes: Express 4 does NOT automatically forward rejected
 * promises from async route handlers to this error handler — an async
 * controller must call next(err) itself (or be wrapped in a catchAsync
 * helper, added in Phase 6) for errors to reach here at all. No route
 * handlers exist yet in this phase, so this is noted for later phases to
 * account for, not something Phase 3 needs to solve.
 */
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (!env.isProduction) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

export default { notFoundHandler, globalErrorHandler };
