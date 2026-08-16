/**
 * Operational error class for expected, anticipated failures — invalid
 * credentials, a resource that doesn't exist, a duplicate email on
 * registration, etc. Thrown deliberately by services/controllers in later
 * phases, as opposed to unexpected programmer bugs (TypeErrors, undefined
 * is not a function) which remain plain Error/thrown exceptions.
 *
 * Compatible with the existing src/middlewares/errorHandler.js as-is:
 * globalErrorHandler already reads `err.statusCode` and `err.message` and
 * falls back to 500 when statusCode is absent — no change to that file was
 * needed. AppError simply guarantees those two fields are always present
 * and correctly typed when the throwing code wants a specific status.
 *
 * Usage (Phase 7+):
 *   throw new AppError('Invalid credentials', 401);
 *   throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    if (errorCode) {
      this.errorCode = errorCode;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
