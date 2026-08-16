import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import AppError from '../utils/appError.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { HTTP_STATUS, AUTH_PROVIDERS } from '../constants.js';

/**
 * All authentication business logic lives here. Nothing in this file sends
 * an HTTP response — it returns data or throws AppError. Password hashing
 * (bcrypt) and JWT payload shaping both happen here rather than in the
 * model or the token utility — the model is a pure schema, and
 * src/utils/token.js only knows how to sign/verify whatever payload it's
 * given, not what that payload should contain.
 */

const SALT_ROUNDS = 12;
const GENERIC_INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const INACTIVE_ACCOUNT_MESSAGE = 'This account has been deactivated';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function toSafeUser(user) {
  // User's toJSON transform strips passwordHash/__v and converts _id.
  return user.toJSON();
}

/**
 * Signs a fresh access+refresh pair for a user, persists the refresh
 * token's hash (with its jti), and returns everything the caller needs.
 * Shared by register, login, refresh (rotation), and the Google OAuth
 * callback — the single place token issuance actually happens.
 */
async function issueTokenPair(user) {
  const jti = crypto.randomUUID();
  const userId = user._id.toString();

  const accessToken = generateAccessToken({ sub: userId, role: user.role, type: 'access' });
  const refreshToken = generateRefreshToken({ sub: userId, type: 'refresh', jti });

  // Read back the refresh token's own `exp` claim rather than re-deriving
  // an expiry from env.jwt.refreshExpiresIn a second time — guarantees the
  // DB record and the JWT itself never drift out of sync.
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  const refreshDoc = await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    jti,
    userId: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken, refreshDoc };
}

export async function registerLocalUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('Email is already registered', HTTP_STATUS.CONFLICT);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    authProvider: AUTH_PROVIDERS.LOCAL,
  });

  const { accessToken, refreshToken } = await issueTokenPair(user);

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function loginLocalUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Identical message/status whether the email doesn't exist, belongs to a
  // Google-only account, or the password is wrong — revealing which of
  // those is true would let an attacker enumerate registered emails.
  if (!user || user.authProvider !== AUTH_PROVIDERS.LOCAL || !user.passwordHash) {
    throw new AppError(GENERIC_INVALID_CREDENTIALS_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(GENERIC_INVALID_CREDENTIALS_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
  }

  // Checked only AFTER credentials are confirmed correct, so an attacker
  // without the right password never learns the account is deactivated.
  if (!user.isActive) {
    throw new AppError(INACTIVE_ACCOUNT_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair(user);

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function refreshAccessToken(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token is required', HTTP_STATUS.UNAUTHORIZED);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', HTTP_STATUS.UNAUTHORIZED);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  // Not found at all, OR already revoked (reuse of a rotated-away token) —
  // both are treated identically. A legitimate client never replays a
  // refresh token it already exchanged.
  if (!storedToken || storedToken.revokedAt) {
    throw new AppError('Refresh token has been revoked', HTTP_STATUS.UNAUTHORIZED);
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    throw new AppError('Refresh token has expired', HTTP_STATUS.UNAUTHORIZED);
  }

  if (storedToken.userId.toString() !== decoded.sub || storedToken.jti !== decoded.jti) {
    throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw new AppError(INACTIVE_ACCOUNT_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
  }

  // Rotation: issue the new pair first, then link+revoke the old record —
  // if token issuance somehow failed, the old (still valid) token is not
  // left in a half-revoked state with nothing to replace it.
  const { accessToken, refreshToken, refreshDoc } = await issueTokenPair(user);

  storedToken.revokedAt = new Date();
  storedToken.replacedBy = refreshDoc._id;
  await storedToken.save();

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function logoutUser(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }

  // No JWT verification needed here — hash-based lookup works even for an
  // already-expired-but-structurally-intact token, and logout should still
  // succeed in revoking whatever session record it corresponds to.
  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  // Already gone or already revoked — logout is idempotent, not an error.
  if (!storedToken || storedToken.revokedAt) {
    return;
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();
}

export async function getCurrentUser(userId) {
  // Re-fetched from the DB rather than trusting the access token's payload
  // verbatim — role/isActive may have changed since it was issued.
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError(INACTIVE_ACCOUNT_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
  }

  return toSafeUser(user);
}

/**
 * Called from the Google OAuth Passport strategy's verify callback
 * (src/config/passport.js) — never from a controller directly. Google
 * authenticates the person; PeerPrep's own JWTs are issued separately by
 * authController.googleCallback calling issueTokenPair() after this
 * resolves — Google's OAuth access token is never used as or mixed with a
 * PeerPrep access token.
 */
export async function findOrCreateGoogleUser(googleProfile) {
  const googleId = googleProfile.id;
  const email = googleProfile.emails && googleProfile.emails[0] && googleProfile.emails[0].value;

  if (!email) {
    throw new AppError('Google account has no accessible email address', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedEmail = normalizeEmail(email);

  const existingByGoogleId = await User.findOne({ googleId });
  if (existingByGoogleId) {
    return existingByGoogleId;
  }

  const existingByEmail = await User.findOne({ email: normalizedEmail });

  if (existingByEmail) {
    // A local-password account already owns this email — do NOT silently
    // attach Google sign-in to it (that would let anyone who controls a
    // Google account with a matching email take over an existing local
    // account). Surface it explicitly instead.
    if (existingByEmail.authProvider === AUTH_PROVIDERS.LOCAL) {
      throw new AppError(
        'An account with this email already exists. Please log in with your password.',
        HTTP_STATUS.CONFLICT,
      );
    }

    // Existing Google-provider account found by email but missing googleId
    // (shouldn't normally happen) — attach it defensively.
    if (!existingByEmail.googleId) {
      existingByEmail.googleId = googleId;
      await existingByEmail.save();
    }

    return existingByEmail;
  }

  const newUser = await User.create({
    email: normalizedEmail,
    authProvider: AUTH_PROVIDERS.GOOGLE,
    googleId,
    // Google has already verified this email address.
    isEmailVerified: true,
  });

  return newUser;
}

export { issueTokenPair };

export default {
  registerLocalUser,
  loginLocalUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  findOrCreateGoogleUser,
  issueTokenPair,
};
