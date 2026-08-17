import * as profileService from '../services/profileService.js';
import catchAsync from '../utils/catchAsync.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Thin HTTP layer only — pulls the authenticated userId off req.user
 * (never req.body) and delegates everything else to profileService.
 */

export const getCurrentProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getProfile(req.user.userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { profile },
  });
});

export const updateCurrentProfile = catchAsync(async (req, res) => {
  const profile = await profileService.updateProfile(req.user.userId, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully',
    data: { profile },
  });
});

export default { getCurrentProfile, updateCurrentProfile };
