import * as sessionService from '../services/sessionService.js';
import catchAsync from '../utils/catchAsync.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Thin HTTP layer only — no state-machine logic here. Every handler pulls
 * the authenticated userId from req.user (never req.body/req.params) and
 * delegates entirely to sessionService.
 */

export const createSession = catchAsync(async (req, res) => {
  const {
    participantId,
    scheduledAt,
    duration,
    topic,
  } = req.body;

  const session = await sessionService.createSession(req.user.userId, {
    participantId,
    scheduledAt,
    duration,
    topic,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Session created',
    data: { session },
  });
});

export const getMySessions = catchAsync(async (req, res) => {
  const { status, upcoming, past } = req.query;

  const sessions = await sessionService.getMySessions(req.user.userId, { status, upcoming, past });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { sessions },
  });
});

export const getSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.getSessionById(sessionId, req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { session },
  });
});

export const confirmSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.confirmSession(sessionId, req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Session confirmed',
    data: { session },
  });
});

export const startSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.startSession(sessionId, req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Session started',
    data: { session },
  });
});

export const completeSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.completeSession(sessionId, req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Session completed',
    data: { session },
  });
});

export const cancelSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.cancelSession(sessionId, req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Session cancelled',
    data: { session },
  });
});

export const rescheduleSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { scheduledAt } = req.body;

  const session = await sessionService.rescheduleSession(sessionId, req.user.userId, { scheduledAt });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Session rescheduled',
    data: { session },
  });
});

export default {
  createSession,
  getMySessions,
  getSession,
  confirmSession,
  startSession,
  completeSession,
  cancelSession,
  rescheduleSession,
};
