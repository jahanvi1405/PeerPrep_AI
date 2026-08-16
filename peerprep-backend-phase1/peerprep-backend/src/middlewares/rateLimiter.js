import rateLimit from 'express-rate-limit';

/**
 * Factory for route-specific rate limiters.
 *
 * This is deliberately NOT another global limiter — src/middlewares/
 * globalMiddleware.js already registers one app-wide limiter (using
 * RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX from .env) that every request
 * passes through. This factory exists for the small set of sensitive
 * endpoints that need a *stricter* limit on top of that baseline —
 * login, register, forgot-password, resend-verification, etc. — added
 * starting Phase 7.
 *
 * Usage (by future route modules):
 *
 *   import createRateLimiter from '../middlewares/rateLimiter.js';
 *
 *   const loginLimiter = createRateLimiter({
 *     windowMs: 15 * 60 * 1000,
 *     max: 5,
 *     message: 'Too many login attempts. Please try again in 15 minutes.',
 *   });
 *
 *   router.post('/login', loginLimiter, authController.login);
 *
 * No new environment variables are introduced here — per-route limits are
 * few, specific to what each endpoint needs, and are more readable defined
 * at the call site in Phase 7 than as a wall of loosely-related env vars
 * here that would need updating every time a new sensitive route is added.
 */
export function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: message || 'Too many requests. Please try again later.',
    },
  });
}

export default createRateLimiter;
