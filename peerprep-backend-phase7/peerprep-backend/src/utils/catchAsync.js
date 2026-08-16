/**
 * Wraps an async Express handler so a rejected promise or thrown error is
 * forwarded to next(error) instead of crashing the process or hanging the
 * request. Express 4 does not do this automatically for async handlers —
 * without this wrapper, every future async controller would need its own
 * try/catch just to call next(err) in the catch block.
 *
 * Contains no business logic and never sends a response itself — it only
 * ever calls the handler you give it, or forwards its error.
 *
 * Usage (Phase 7+):
 *   router.get('/example', catchAsync(controller.method));
 */
export default function catchAsync(handler) {
  return function catchAsyncWrapper(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
