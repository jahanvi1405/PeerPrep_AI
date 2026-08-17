import mongoose from 'mongoose';

import { PROFICIENCY_LEVELS } from '../constants.js';

/**
 * Join collection linking a User to a Skill, with a proficiency level —
 * this is the actual "what does this person know, and how well" data the
 * matching engine (Phase 9+) will read. Deliberately a separate collection
 * rather than an array embedded on Profile: it needs its own uniqueness
 * constraint (one relationship per user+skill pair) and independent
 * indexing by both userId and skillId for lookups in either direction,
 * which is awkward to enforce on an embedded subdocument array.
 */
const userSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },

    level: {
      type: String,
      enum: Object.values(PROFICIENCY_LEVELS),
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// The actual duplicate-prevention mechanism: a user cannot have two
// UserSkill documents for the same skill. Enforced at the database level,
// not just checked-then-created in the service (which would have a race
// condition between the check and the insert).
userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });

userSkillSchema.set('toJSON', {
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

const UserSkill = mongoose.model('UserSkill', userSkillSchema);

export default UserSkill;
