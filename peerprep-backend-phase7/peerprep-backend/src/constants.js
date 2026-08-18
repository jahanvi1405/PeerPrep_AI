/**
 * Application-wide constants.
 * Centralized here so no magic strings are scattered across models/services/controllers —
 * a role typo or status typo becomes a single source of truth bug, not a hunt-and-fix.
 */

export const NODE_ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

export const USER_ROLES = {
  STUDENT: 'student',
  MENTOR: 'mentor',
  ADMIN: 'admin',
};

export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
};

// Interview-session lifecycle (Phase 9). Note: this replaces an earlier
// placeholder value set from Phase 1 scaffolding that was never actually
// used anywhere in the codebase (verified — zero imports/references
// existed for the old shape) and didn't match the state machine Phase 9
// actually requires. No functional code depended on the old values.
export const SESSION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const SESSION_DURATION_MINUTES = {
  MIN: 15,
  MAX: 180,
};

export const INTERVIEW_TYPE = {
  TECHNICAL: 'technical',
  HR: 'hr',
  MIXED: 'mixed',
};

export const AI_CHAT_MODE = {
  LEARNING: 'learning',
  INTERVIEW_COACH: 'interview_coach',
  ONBOARDING: 'onboarding',
};

export const UPLOAD_TYPE = {
  AVATAR: 'avatar',
  RESUME: 'resume',
};

// Shared by Profile.experienceLevel and UserSkill.level (Phase 8) — one
// canonical set of levels rather than two schemas each defining their own
// copy of the same three strings.
export const PROFICIENCY_LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken',
};

export default {
  NODE_ENV,
  USER_ROLES,
  AUTH_PROVIDERS,
  SESSION_STATUS,
  SESSION_DURATION_MINUTES,
  INTERVIEW_TYPE,
  AI_CHAT_MODE,
  UPLOAD_TYPE,
  PROFICIENCY_LEVELS,
  HTTP_STATUS,
  COOKIE_NAMES,
};
