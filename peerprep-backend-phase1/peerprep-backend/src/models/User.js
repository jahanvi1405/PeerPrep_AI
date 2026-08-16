import mongoose from 'mongoose';

import { USER_ROLES, AUTH_PROVIDERS } from '../constants.js';

/**
 * User model — authentication foundation only.
 *
 * Deliberately excludes a display-name / profile field even though most
 * registration forms would want one: this schema tracks only what Phase 7
 * (Authentication) explicitly needs, and name/avatar/bio are Phase 8 (User
 * Profile) concerns. Register/login validation in authRoutes.js matches
 * this — email + password only.
 *
 * Password hashing does NOT happen here. It happens in authService.js
 * (bcrypt.hash before User.create / before comparing on login) — this
 * model is a pure schema with no bcrypt dependency at all.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Never returned by default (select: false). Not required for
    // Google-authenticated users, who never set a local password.
    passwordHash: {
      type: String,
      required: [
        function passwordHashRequiredForLocalAuth() {
          return this.authProvider === AUTH_PROVIDERS.LOCAL;
        },
        'Password is required for local accounts',
      ],
      select: false,
    },

    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.LOCAL,
    },

    // Only present for Google-authenticated accounts. Sparse so multiple
    // local-auth users (googleId: undefined) don't collide on the unique index.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Defaults false for local registration since Phase 7 doesn't implement
    // an email-verification flow yet. Google-authenticated users have this
    // set to true explicitly at creation (Google has already verified the
    // email) — see authService.findOrCreateGoogleUser.
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Defense in depth on top of `select: false` — even if a future query
 * explicitly selects +passwordHash, it never survives serialization to
 * JSON (API responses, logs that stringify a doc, etc.).
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret.passwordHash;
    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
