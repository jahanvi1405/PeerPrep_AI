import { Router } from 'express';
import Joi from 'joi';

import {
  createSession,
  getMySessions,
  getSession,
  confirmSession,
  startSession,
  completeSession,
  cancelSession,
  rescheduleSession,
} from '../controllers/sessionController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { SESSION_STATUS, SESSION_DURATION_MINUTES } from '../constants.js';

/**
 * Everything under /api/{apiVersion}/sessions. All routes require
 * authentication; ownership/state-transition logic lives entirely in
 * sessionService.js, never here.
 */

const router = Router();

const objectIdSchema = Joi.string().hex().length(24);

const createSessionSchema = {
  body: Joi.object({
    participantId: objectIdSchema.required(),
    scheduledAt: Joi.date().iso().greater('now').required(),
    duration: Joi.number()
      .integer()
      .min(SESSION_DURATION_MINUTES.MIN)
      .max(SESSION_DURATION_MINUTES.MAX)
      .required(),
    topic: Joi.string().trim().max(200).allow(''),
  }),
};

const listSessionsSchema = {
  query: Joi.object({
    status: Joi.string().valid(...Object.values(SESSION_STATUS)),
    upcoming: Joi.boolean(),
    past: Joi.boolean(),
  }),
};

const sessionIdParamSchema = {
  params: Joi.object({
    sessionId: objectIdSchema.required(),
  }),
};

const rescheduleSchema = {
  params: Joi.object({
    sessionId: objectIdSchema.required(),
  }),
  body: Joi.object({
    scheduledAt: Joi.date().iso().greater('now').required(),
  }),
};

router.post('/', authenticate, validate(createSessionSchema), createSession);
router.get('/', authenticate, validate(listSessionsSchema), getMySessions);
router.get('/:sessionId', authenticate, validate(sessionIdParamSchema), getSession);
router.post('/:sessionId/confirm', authenticate, validate(sessionIdParamSchema), confirmSession);
router.post('/:sessionId/start', authenticate, validate(sessionIdParamSchema), startSession);
router.post('/:sessionId/complete', authenticate, validate(sessionIdParamSchema), completeSession);
router.post('/:sessionId/cancel', authenticate, validate(sessionIdParamSchema), cancelSession);
router.patch('/:sessionId/reschedule', authenticate, validate(rescheduleSchema), rescheduleSession);

export default router;
