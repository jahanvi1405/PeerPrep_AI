import { Router } from 'express';
import Joi from 'joi';

import {
  getCurrentProfile,
  updateCurrentProfile,
} from '../controllers/profileController.js';
import {
  getMySkills,
  addMySkill,
  updateMySkill,
  removeMySkill,
} from '../controllers/skillController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { PROFICIENCY_LEVELS } from '../constants.js';

/**
 * Everything under /api/{apiVersion}/profile — the authenticated user's
 * own profile, plus their skill relationships (nested here rather than
 * under skillRoutes.js because "my skills" is profile-scoped data, both
 * in the URL shape the spec calls for and in ownership semantics: every
 * handler below operates on req.user.userId, never a client-supplied id).
 *
 * The public skill catalog (GET /api/{apiVersion}/skills) lives in
 * skillRoutes.js instead — a genuinely public, unauthenticated resource,
 * not something that belongs under /profile.
 */

const router = Router();

const objectIdSchema = Joi.string().hex().length(24);
const levelSchema = Joi.string().valid(...Object.values(PROFICIENCY_LEVELS));

/**
 * Partial update — at least one recognized field required, or a PATCH with
 * an empty/all-unknown body would silently succeed and change nothing,
 * which is more confusing than rejecting it outright.
 */
const updateProfileSchema = {
  body: Joi.object({
    displayName: Joi.string().trim().max(60),
    bio: Joi.string().trim().max(500).allow(''),
    college: Joi.string().trim().max(120),
    branch: Joi.string().trim().max(120),
    graduationYear: Joi.number().integer().min(1950).max(2100),
    experienceLevel: levelSchema,
  }).min(1),
};

const addSkillSchema = {
  body: Joi.object({
    skillId: objectIdSchema.required(),
    level: levelSchema.required(),
  }),
};

const updateSkillSchema = {
  params: Joi.object({
    skillId: objectIdSchema.required(),
  }),
  body: Joi.object({
    level: levelSchema.required(),
  }),
};

const skillIdParamSchema = {
  params: Joi.object({
    skillId: objectIdSchema.required(),
  }),
};

router.get('/', authenticate, getCurrentProfile);
router.patch('/', authenticate, validate(updateProfileSchema), updateCurrentProfile);

router.get('/skills', authenticate, getMySkills);
router.post('/skills', authenticate, validate(addSkillSchema), addMySkill);
router.patch('/skills/:skillId', authenticate, validate(updateSkillSchema), updateMySkill);
router.delete('/skills/:skillId', authenticate, validate(skillIdParamSchema), removeMySkill);

export default router;
