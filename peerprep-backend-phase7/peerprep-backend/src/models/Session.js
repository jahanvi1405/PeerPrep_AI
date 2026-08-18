import mongoose from 'mongoose';

import { SESSION_STATUS, SESSION_DURATION_MINUTES } from '../constants.js';

/**
 * A scheduled peer interview session between a host and a participant.
 * The status field is the state machine's source of truth — valid
 * transitions are enforced in sessionService.js via atomic, status-filtered
 * updates, never by trusting an arbitrary client-supplied status value.
 * This schema only encodes the allowed *set* of values (enum) and data
 * shape; it deliberately does not encode transition rules itself.
 */
const sessionSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
      min: SESSION_DURATION_MINUTES.MIN,
      max: SESSION_DURATION_MINUTES.MAX,
    },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
      required: true,
      index: true,
    },

    topic: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Schema-level backstop only — the authoritative "host and participant
 * cannot be the same user" check happens in sessionService.createSession
 * and produces a proper AppError/400 before a document is ever built. This
 * hook exists purely as defense in depth against any future code path that
 * might construct a Session directly, bypassing the service.
 */
sessionSchema.pre('validate', function ensureDistinctParticipants(next) {
  if (this.hostId && this.participantId && this.hostId.equals(this.participantId)) {
    next(new Error('Host and participant must be different users'));
    return;
  }
  next();
});

// Query patterns this supports: "my sessions" (host or participant) sorted
// by scheduledAt, and status-filtered listings — matches getMySessions in
// sessionService.js. Not adding an index on scheduledAt alone since it's
// always queried alongside hostId/participantId/status in this phase.
sessionSchema.index({ hostId: 1, scheduledAt: 1 });
sessionSchema.index({ participantId: 1, scheduledAt: 1 });
sessionSchema.index({ status: 1, scheduledAt: 1 });

sessionSchema.set('toJSON', {
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;
