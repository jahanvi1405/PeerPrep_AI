import { filterXSS } from 'xss';

/**
 * Opt-in, field-level XSS sanitization.
 *
 * WHY NOT A GLOBAL/BLANKET XSS MIDDLEWARE:
 * PeerPrep AI is a coding / interview-prep platform — session notes, mock
 * interview answers, and skill descriptions will routinely contain code
 * snippets with `<`, `>`, `{`, `}`, `&&`, etc. A blanket sanitizer running
 * over every request body (the way express-mongo-sanitize already runs
 * globally in globalMiddleware.js) would silently mangle legitimate
 * technical content — e.g. someone pasting `if (a < b) {}` into an answer
 * field. That's a real product-breaking cost, not a hypothetical one.
 *
 * On top of that, the frontend is React/Next.js, which escapes string
 * interpolation into the DOM by default. So the classic stored-XSS vector
 * (raw HTML/script rendered unescaped) is already mitigated for any field
 * the frontend doesn't explicitly render via dangerouslySetInnerHTML.
 * Blanket server-side stripping would be defense-in-depth for a risk that's
 * already fairly well contained on the render side, at the cost of breaking
 * legitimate input.
 *
 * WHAT THIS DOES COVER: specific free-text fields that are genuinely
 * HTML-injection-risky and have no legitimate reason to contain markup —
 * display name, headline, review/feedback comments. Routes opt in per
 * field, so a route accepting code content (mock interview answers, session
 * notes) is never at risk of this middleware corrupting it.
 *
 * Usage (by future route modules):
 *
 *   import sanitizeFields from '../middlewares/sanitizeFields.js';
 *
 *   router.patch('/me', sanitizeFields(['displayName', 'headline']), userController.updateProfile);
 *
 * TRADEOFF: this only sanitizes the exact fields listed, on req.body, at
 * the top level. It does not walk nested objects/arrays. That's intentional
 * for this phase — a generic deep-sanitizer is easy to write but easy to
 * misuse (it re-introduces the "corrupts code snippets" problem the moment
 * it's applied somewhere it shouldn't be). Nested/array cases can be
 * handled explicitly by the route that needs them when that need actually
 * arises, rather than guessed at here.
 */
export function sanitizeFields(fields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    fields.forEach((field) => {
      if (typeof req.body[field] === 'string') {
        req.body[field] = filterXSS(req.body[field]);
      }
    });

    return next();
  };
}

export default sanitizeFields;
