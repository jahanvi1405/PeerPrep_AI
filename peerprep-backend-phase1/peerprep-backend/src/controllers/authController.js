import jwt from 'jsonwebtoken';

import * as authService from '../services/authService.js';
import catchAsync from '../utils/catchAsync.js';
import env from '../config/env.js';
import { HTTP_STATUS, COOKIE_NAMES } from '../constants.js';

/**
 * Thin HTTP layer only: pull data off the request, call authService, shape
 * the response, manage the refresh-token cookie. No bcrypt, no JWT
 * signing/verification, no Mongoose queries, no authentication business
 * rules — all of that lives in authService.js / the models / utils/token.js.
 */

/**
 * Centralized, environment-aware refresh-token cookie options. httpOnly
 * always; secure only in production (a non-HTTPS local dev server can't
 * set a `secure` cookie the browser will actually store); sameSite 'none'
 * in production to support a frontend on a different domain (requires
 * secure: true, only set in production, so this pairing is valid), 'lax'
 * locally. Path is built from env.apiVersion rather than the hardcoded
 * '/api/v1/auth' so it stays correct if API_VERSION ever changes.
 */
function buildRefreshCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: `/api/${env.apiVersion}/auth`,
    maxAge: maxAgeMs,
  };
}

function setRefreshCookie(res, refreshToken) {
  const decoded = jwt.decode(refreshToken);
  const maxAgeMs = decoded.exp * 1000 - Date.now();
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, buildRefreshCookieOptions(maxAgeMs));
}

function clearRefreshCookie(res) {
  // maxAge is irrelevant for clearCookie, but httpOnly/secure/sameSite/path
  // must match how the cookie was originally set or the browser won't
  // recognize it as the same cookie to remove.
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, buildRefreshCookieOptions(0));
}

export const register = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.registerLocalUser({ email, password });

  setRefreshCookie(res, refreshToken);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Registered successfully',
    data: { user, accessToken },
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.loginLocalUser({ email, password });

  setRefreshCookie(res, refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged in successfully',
    data: { user, accessToken },
  });
});

export const refresh = catchAsync(async (req, res) => {
  const rawRefreshToken = req.cookies ? req.cookies[COOKIE_NAMES.REFRESH_TOKEN] : undefined;

  const { user, accessToken, refreshToken } = await authService.refreshAccessToken(rawRefreshToken);

  setRefreshCookie(res, refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Access token refreshed',
    data: { user, accessToken },
  });
});

export const logout = catchAsync(async (req, res) => {
  const rawRefreshToken = req.cookies ? req.cookies[COOKIE_NAMES.REFRESH_TOKEN] : undefined;

  await authService.logoutUser(rawRefreshToken);

  clearRefreshCookie(res);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const getCurrentUser = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user },
  });
});

/**
 * Mounted after passport.authenticate('google', { session: false }) in
 * authRoutes.js — by the time this runs, req.user is the Mongoose User
 * document Passport's verify callback resolved (via
 * authService.findOrCreateGoogleUser). Google's own OAuth access token is
 * discarded here — it is never used as or mixed with a PeerPrep token;
 * this always issues a fresh PeerPrep-native pair via issueTokenPair.
 *
 * Deliberately NOT putting the access token in the redirect URL (query
 * strings end up in browser history / server logs / the Referer header).
 * Only the refresh cookie is set; the frontend lands on its callback route
 * and calls POST /auth/refresh (the httpOnly cookie is already set) to
 * obtain an access token.
 */
export const googleCallback = catchAsync(async (req, res) => {
  const { refreshToken } = await authService.issueTokenPair(req.user);

  setRefreshCookie(res, refreshToken);

  res.redirect(`${env.clientUrl}/oauth/callback`);
});

export default {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  googleCallback,
};
