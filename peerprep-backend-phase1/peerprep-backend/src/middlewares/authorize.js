import AppError from '../utils/appError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Role guard — must run after `authenticate` (src/middlewares/auth.js),
 * which is what populates req.user. Kept as its own file, separate from
 * auth.js: authenticate answers "who is this and are they logged in",
 * authorize answers "is this specific role allowed here" — two distinct
 * concerns future routes will mix and match differently per endpoint.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize(USER_ROLES.ADMIN), handler);
 *   router.post('/mentor-action', authenticate, authorize(USER_ROLES.MENTOR, USER_ROLES.ADMIN), handler);
 */
export default function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', HTTP_STATUS.FORBIDDEN));
      return;
    }

    next();
  };
}
