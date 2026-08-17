import Profile from '../models/Profile.js';

/**
 * Profile business logic. Both functions take a userId that must come from
 * the authenticated request (req.user.userId, set by the authenticate
 * middleware) — never from anything a client supplies directly, so a user
 * can never read or write another user's profile by passing a different id.
 */

/**
 * Returns the authenticated user's profile, creating an empty one on first
 * access if it doesn't exist yet. Registration (Phase 7) doesn't create a
 * Profile document — auth and profile are deliberately separate concerns —
 * so without this upsert, a brand-new user's first GET /profile would 404
 * before they've ever had a chance to fill anything in. `upsert` + the
 * unique index on Profile.userId make this race-safe: even if two requests
 * hit this at once, at most one document is ever created per user.
 */
export async function getProfile(userId) {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return profile.toJSON();
}

/**
 * Applies a partial update to the authenticated user's profile. `updates`
 * is expected to already be validated/stripped-of-unknown-fields by the
 * validate middleware (see routes/profileRoutes.js) before it reaches
 * here — this function trusts its input is safe to pass to Mongoose,
 * exactly as it trusts userId came from req.user, not the request body.
 */
export async function updateProfile(userId, updates) {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: updates, $setOnInsert: { userId } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
      context: 'query',
    },
  );

  return profile.toJSON();
}

export default { getProfile, updateProfile };
