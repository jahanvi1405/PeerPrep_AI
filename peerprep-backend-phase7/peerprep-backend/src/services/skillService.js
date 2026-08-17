import Skill from '../models/Skill.js';
import UserSkill from '../models/UserSkill.js';
import AppError from '../utils/appError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Skill catalog + user-skill relationship business logic. Every function
 * that touches a UserSkill takes userId from the authenticated request
 * (req.user.userId) and always includes it in the query filter — a user
 * can only ever read/modify/delete their own UserSkill rows, because rows
 * belonging to someone else simply never match the filter and come back
 * as "not found," not as a permission error to work around.
 */

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Public catalog listing — no ownership concerns, no auth required
 * (enforced at the route level, not here).
 */
export async function listSkills() {
  const skills = await Skill.find().sort({ name: 1 });
  return skills.map((skill) => skill.toJSON());
}

export async function listUserSkills(userId) {
  const userSkills = await UserSkill.find({ userId }).populate('skillId', 'name slug');

  // Reshape so the response carries useful skill info (name/slug) rather
  // than a bare skillId the client would have to cross-reference itself.
  return userSkills.map((userSkill) => ({
    id: userSkill._id.toString(),
    level: userSkill.level,
    skill: userSkill.skillId
      ? { id: userSkill.skillId._id.toString(), name: userSkill.skillId.name, slug: userSkill.skillId.slug }
      : null,
    createdAt: userSkill.createdAt,
    updatedAt: userSkill.updatedAt,
  }));
}

export async function addUserSkill(userId, { skillId, level }) {
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new AppError('Skill not found', HTTP_STATUS.NOT_FOUND);
  }

  try {
    const userSkill = await UserSkill.create({ userId, skillId, level });
    return {
      id: userSkill._id.toString(),
      level: userSkill.level,
      skill: { id: skill._id.toString(), name: skill.name, slug: skill.slug },
      createdAt: userSkill.createdAt,
      updatedAt: userSkill.updatedAt,
    };
  } catch (err) {
    // The compound unique index on { userId, skillId } is the actual
    // enforcement mechanism (race-safe); this just translates Mongo's raw
    // duplicate-key error into the project's standard error shape instead
    // of letting a 500 with a Mongo error message leak to the client.
    if (err.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
      throw new AppError('This skill has already been added to your profile', HTTP_STATUS.CONFLICT);
    }
    throw err;
  }
}

export async function updateUserSkill(userId, skillId, { level }) {
  const userSkill = await UserSkill.findOneAndUpdate(
    { userId, skillId },
    { $set: { level } },
    { new: true, runValidators: true, context: 'query' },
  ).populate('skillId', 'name slug');

  // Filtering by { userId, skillId } together means a request for another
  // user's UserSkill row (or a skillId the caller never added) can never
  // match — it reads as "not found," which is also the correct response
  // whether the row truly doesn't exist or it exists but isn't theirs.
  if (!userSkill) {
    throw new AppError('Skill not found on your profile', HTTP_STATUS.NOT_FOUND);
  }

  return {
    id: userSkill._id.toString(),
    level: userSkill.level,
    skill: userSkill.skillId
      ? { id: userSkill.skillId._id.toString(), name: userSkill.skillId.name, slug: userSkill.skillId.slug }
      : null,
    createdAt: userSkill.createdAt,
    updatedAt: userSkill.updatedAt,
  };
}

export async function removeUserSkill(userId, skillId) {
  // Deletes only the UserSkill relationship row — never the global Skill
  // document itself, so removing a skill from one user's profile has zero
  // effect on any other user's UserSkill rows referencing the same Skill.
  const result = await UserSkill.findOneAndDelete({ userId, skillId });

  if (!result) {
    throw new AppError('Skill not found on your profile', HTTP_STATUS.NOT_FOUND);
  }
}

export default {
  listSkills,
  listUserSkills,
  addUserSkill,
  updateUserSkill,
  removeUserSkill,
};
