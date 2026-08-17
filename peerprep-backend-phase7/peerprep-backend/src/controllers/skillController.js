import * as skillService from '../services/skillService.js';
import catchAsync from '../utils/catchAsync.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Thin HTTP layer only — skillId ownership checks, duplicate detection,
 * and Skill-vs-UserSkill distinctions all live in skillService.js.
 */

export const getSkillCatalog = catchAsync(async (req, res) => {
  const skills = await skillService.listSkills();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { skills },
  });
});

export const getMySkills = catchAsync(async (req, res) => {
  const skills = await skillService.listUserSkills(req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { skills },
  });
});

export const addMySkill = catchAsync(async (req, res) => {
  const { skillId, level } = req.body;

  const userSkill = await skillService.addUserSkill(req.user.userId, { skillId, level });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Skill added to profile',
    data: { skill: userSkill },
  });
});

export const updateMySkill = catchAsync(async (req, res) => {
  const { skillId } = req.params;
  const { level } = req.body;

  const userSkill = await skillService.updateUserSkill(req.user.userId, skillId, { level });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Skill updated',
    data: { skill: userSkill },
  });
});

export const removeMySkill = catchAsync(async (req, res) => {
  const { skillId } = req.params;

  await skillService.removeUserSkill(req.user.userId, skillId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Skill removed from profile',
  });
});

export default {
  getSkillCatalog,
  getMySkills,
  addMySkill,
  updateMySkill,
  removeMySkill,
};
