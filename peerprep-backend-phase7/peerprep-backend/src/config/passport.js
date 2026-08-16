import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import env from './env.js';
import { findOrCreateGoogleUser } from '../services/authService.js';

/**
 * Google OAuth strategy configuration — the only place OAuth provider
 * config is wired up. The actual find-or-create business logic lives in
 * authService.findOrCreateGoogleUser(); this file's job is only to hand
 * Passport a verify callback that delegates to it.
 *
 * session: false everywhere this strategy is used (see authRoutes.js) —
 * this project is JWT-based, not session-based, so Passport never needs to
 * serialize/deserialize a user into an Express session.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateGoogleUser(profile);
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

export default passport;
