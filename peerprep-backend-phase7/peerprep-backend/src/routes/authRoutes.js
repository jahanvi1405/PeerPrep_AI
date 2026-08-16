import { Router } from 'express';
import Joi from 'joi';

import passport from '../config/passport.js';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  googleCallback,
} from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/auth.js';
import env from '../config/env.js';

/**
 * All authentication endpoints, mounted at /api/{API_VERSION}/auth by
 * src/routes/index.js. No business logic here — only routing, validation
 * schemas, and rate-limit configuration, wiring together the existing
 * reusable middleware (validate, rateLimiter, auth) and authController.
 */

const router = Router();

// passport.initialize() is scoped to this router rather than app.js, so
// Google OAuth wiring stays entirely self-contained within the auth module
// instead of requiring a change to the shared, already-verified app.js.
router.use(passport.initialize());

/**
 * ─────────────────────────────────────────────────────────────
 * Validation schemas
 * ─────────────────────────────────────────────────────────────
 * Email + password only — matches the User model, which has no name/
 * profile field at this phase. No password-confirmation field: it's a
 * client-side UX check (comparing two inputs before submit), and enforcing
 * it server-side adds a field with no security benefit — a mismatched
 * confirmation is not a validity concern for the account being created.
 */
const registerSchema = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email()
      .required(),
    password: Joi.string().min(8).max(128).required(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email()
      .required(),
    password: Joi.string().required(),
  }),
};

/**
 * ─────────────────────────────────────────────────────────────
 * Route-specific rate limits — additive to the global limiter already
 * registered in globalMiddleware.js, not a replacement for it.
 * ─────────────────────────────────────────────────────────────
 */
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts. Please try again later.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many refresh attempts. Please try again later.',
});

// No dedicated limiter on /logout: it only ever revokes a session the
// caller already possesses the refresh cookie for, so the abuse surface is
// minimal — the global limiter is sufficient, and adding friction to
// logging out is a real UX cost for negligible security benefit.

/**
 * ─────────────────────────────────────────────────────────────
 * Local auth
 * ─────────────────────────────────────────────────────────────
 */
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

/**
 * ─────────────────────────────────────────────────────────────
 * Google OAuth
 * ─────────────────────────────────────────────────────────────
 * session: false on both — this project authenticates via JWT, not
 * server-side sessions, so Passport never needs to touch req.session.
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.clientUrl}/login?error=google_auth_failed`,
  }),
  googleCallback,
);

export default router;
