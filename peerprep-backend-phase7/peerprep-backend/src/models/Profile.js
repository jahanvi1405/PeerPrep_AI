import mongoose from 'mongoose';

import { PROFICIENCY_LEVELS } from '../constants.js';

/**
 * A user's PeerPrep profile — separate from User (authentication) on
 * purpose. User owns identity/credentials; Profile owns everything a
 * person fills in about themselves for matching/discovery. Keeping these
 * as two collections means Phase 7's authentication schema never has to
 * grow to accommodate Phase 8+ fields, and this collection can grow
 * further (Phase 9+) without touching auth at all.
 *
 * One Profile per User, enforced by the unique index on userId.
 */
const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    college: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    branch: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    graduationYear: {
      type: Number,
      default: null,
    },

    experienceLevel: {
      type: String,
      enum: Object.values(PROFICIENCY_LEVELS),
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

profileSchema.set('toJSON', {
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
