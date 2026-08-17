import { Router } from 'express';

import { getSkillCatalog } from '../controllers/skillController.js';

/**
 * The public, unauthenticated skill catalog — mounted at
 * /api/{apiVersion}/skills. "My skills" (attach/update/remove/list against
 * the authenticated user) live under /api/{apiVersion}/profile/skills
 * instead, defined in profileRoutes.js, since that data is profile-owned.
 */

const router = Router();

router.get('/', getSkillCatalog);

export default router;
