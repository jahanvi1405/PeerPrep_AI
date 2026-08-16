import User from '../models/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyAccessToken } from '../utils/token.js';
import { HTTP_STATUS } from '../constants.js';

const INVALID_TOKEN_MESSAGE = 'Invalid or expired access token';

/**
 * Verifies the Authorization: Bearer <token> header, confirms it's an
 * access token (not a refresh token accidentally used as one), confirms
 * the user still exists and is active, and attaches a minimal identity to
 * req.user.
 *
 * Queries the database directly — one of the few places middleware is
 * allowed to. The alternative (trusting the JWT payload's role/isActive
 * verbatim) would mean a deactivated account keeps working until its
 * access token naturally expires, which defeats the point of isActive.
 */
export const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    next(new AppError(INVALID_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  // Rejects a well-formed, correctly-signed refresh token presented as an
  // access token — signature validity alone isn't enough, since both token
  // types are signed with different secrets but an attacker with a stolen
  // refresh token shouldn't be able to use it here even if it somehow
  // verified against the wrong secret in a misconfiguration scenario.
  if (decoded.type !== 'access') {
    next(new AppError('Invalid token type', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive) {
    next(new AppError(INVALID_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  // Minimal identity only — not the full Mongoose document. Anything a
  // downstream controller needs beyond this should be fetched explicitly
  // via authService.getCurrentUser(), not assumed to be sitting on req.user.
  req.user = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  next();
});

export default { authenticate };
