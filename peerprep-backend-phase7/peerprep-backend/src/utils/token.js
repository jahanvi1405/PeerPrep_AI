import jwt from 'jsonwebtoken';

import env from '../config/env.js';

/**
 * Reusable JWT helpers — sign and verify only. This is NOT the
 * Authentication module: no login/register logic, no auth middleware, no
 * role guards, no Passport/Google OAuth. Those are Phase 7. This file gives
 * Phase 7 four small, framework-independent building blocks to import.
 *
 * Configuration comes entirely from src/config/env.js's `jwt` block, which
 * reads JWT_ACCESS_SECRET / JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_SECRET /
 * JWT_REFRESH_EXPIRES_IN — names that already existed in .env.example since
 * Phase 1 but weren't yet exposed on the exported env object. No new
 * environment variable names were introduced.
 */

function assertSecretConfigured(secret, envVarName) {
  if (!secret) {
    // Thrown only when a token function is actually called, not at import
    // time — mirrors how src/config/db.js validates MONGO_URI lazily inside
    // connectDB() rather than crashing the whole process at boot for a
    // secret that Phase 6 itself never needs (only Phase 7's routes do).
    throw new Error(`[token] ${envVarName} is not configured. Set it in your .env file.`);
  }
}

export function generateAccessToken(payload) {
  assertSecretConfigured(env.jwt.accessSecret, 'JWT_ACCESS_SECRET');
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

export function generateRefreshToken(payload) {
  assertSecretConfigured(env.jwt.refreshSecret, 'JWT_REFRESH_SECRET');
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  assertSecretConfigured(env.jwt.accessSecret, 'JWT_ACCESS_SECRET');
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  assertSecretConfigured(env.jwt.refreshSecret, 'JWT_REFRESH_SECRET');
  return jwt.verify(token, env.jwt.refreshSecret);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
