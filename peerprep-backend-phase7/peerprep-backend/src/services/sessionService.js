import Session from '../models/Session.js';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import { HTTP_STATUS, SESSION_STATUS } from '../constants.js';

/**
 * Interview-session business logic — creation, listing, and the state
 * machine transitions. Every function takes userId from the authenticated
 * request (req.user.userId via the controller) and folds it directly into
 * the Mongo query filter for anything that reads or mutates a specific
 * session — a session that isn't the caller's simply never matches, and
 * comes back as "not found" rather than a separate permission check to
 * remember to add.
 *
 * State-changing operations (confirm/start/complete/cancel/reschedule) use
 * a single atomic `findOneAndUpdate` with the expected current status
 * folded into the filter, e.g. `{ _id, status: SESSION_STATUS.CONFIRMED }`.
 * This is what actually prevents two concurrent requests from both
 * succeeding at conflicting transitions — only one `findOneAndUpdate` can
 * match and update a given document for a given expected status; a second
 * concurrent request against the now-changed status simply won't match.
 * A separate ownership lookup runs first in each function, but purely to
 * produce a clear 404 vs 400 error message — it never mutates anything, so
 * it doesn't reintroduce the race the atomic update is there to prevent.
 */

function ownershipFilter(userId) {
  return { $or: [{ hostId: userId }, { participantId: userId }] };
}

async function findOwnedSession(sessionId, userId) {
  return Session.findOne({ _id: sessionId, ...ownershipFilter(userId) });
}

export async function createSession(
  hostId,
  {
    participantId,
    scheduledAt,
    duration,
    topic,
  },
) {
  if (hostId === participantId) {
    throw new AppError('Host and participant cannot be the same user', HTTP_STATUS.BAD_REQUEST);
  }

  const participant = await User.findById(participantId);
  if (!participant || !participant.isActive) {
    throw new AppError('Participant not found', HTTP_STATUS.NOT_FOUND);
  }

  const session = await Session.create({
    hostId,
    participantId,
    scheduledAt,
    duration,
    topic: topic || null,
    status: SESSION_STATUS.SCHEDULED,
  });

  return session.toJSON();
}

/**
 * `upcoming`/`past` filter on scheduledAt relative to now; `status` filters
 * to an exact SESSION_STATUS value. All three are optional and combine
 * with AND semantics. Always sorted scheduledAt ascending — kept
 * deliberately simple rather than varying sort direction per filter
 * combination.
 */
export async function getMySessions(userId, { status, upcoming, past } = {}) {
  const filter = ownershipFilter(userId);

  if (status) {
    filter.status = status;
  }

  const now = new Date();
  if (upcoming) {
    filter.scheduledAt = { $gte: now };
  } else if (past) {
    filter.scheduledAt = { $lt: now };
  }

  const sessions = await Session.find(filter).sort({ scheduledAt: 1 });
  return sessions.map((session) => session.toJSON());
}

export async function getSessionById(sessionId, userId) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  return session.toJSON();
}

/**
 * Confirm is deliberately participant-only, not host-or-participant like
 * the other transitions — mirroring a calendar-invite model: the host
 * proposes a session by creating it; the invited participant is the one
 * who accepts it. A host attempting to confirm their own session gets a
 * 403 (they legitimately know the session exists, just aren't the right
 * party for this action) rather than 404 (reserved for callers with no
 * relationship to the session at all).
 */
export async function confirmSession(sessionId, userId) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  if (session.participantId.toString() !== userId) {
    throw new AppError('Only the invited participant can confirm this session', HTTP_STATUS.FORBIDDEN);
  }

  const updated = await Session.findOneAndUpdate(
    { _id: sessionId, participantId: userId, status: SESSION_STATUS.SCHEDULED },
    { $set: { status: SESSION_STATUS.CONFIRMED } },
    { new: true },
  );

  if (!updated) {
    throw new AppError(`Cannot confirm a session with status ${session.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  return updated.toJSON();
}

export async function startSession(sessionId, userId) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await Session.findOneAndUpdate(
    { _id: sessionId, ...ownershipFilter(userId), status: SESSION_STATUS.CONFIRMED },
    { $set: { status: SESSION_STATUS.IN_PROGRESS } },
    { new: true },
  );

  if (!updated) {
    throw new AppError(`Cannot start a session with status ${session.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  return updated.toJSON();
}

export async function completeSession(sessionId, userId) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await Session.findOneAndUpdate(
    { _id: sessionId, ...ownershipFilter(userId), status: SESSION_STATUS.IN_PROGRESS },
    { $set: { status: SESSION_STATUS.COMPLETED } },
    { new: true },
  );

  if (!updated) {
    throw new AppError(`Cannot complete a session with status ${session.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  return updated.toJSON();
}

export async function cancelSession(sessionId, userId) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      ...ownershipFilter(userId),
      status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.CONFIRMED] },
    },
    { $set: { status: SESSION_STATUS.CANCELLED } },
    { new: true },
  );

  if (!updated) {
    throw new AppError(`Cannot cancel a session with status ${session.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  return updated.toJSON();
}

export async function rescheduleSession(sessionId, userId, { scheduledAt }) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      ...ownershipFilter(userId),
      status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.CONFIRMED] },
    },
    { $set: { scheduledAt } },
    { new: true },
  );

  if (!updated) {
    throw new AppError(`Cannot reschedule a session with status ${session.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  return updated.toJSON();
}

export default {
  createSession,
  getMySessions,
  getSessionById,
  confirmSession,
  startSession,
  completeSession,
  cancelSession,
  rescheduleSession,
};
