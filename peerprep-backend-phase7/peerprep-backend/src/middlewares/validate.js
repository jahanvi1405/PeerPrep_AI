import { HTTP_STATUS } from '../constants.js';

/**
 * Reusable Joi-based request validation middleware.
 *
 * Usage (by future route modules, starting Phase 7):
 *
 *   import Joi from 'joi';
 *   import { validate } from '../middlewares/validate.js';
 *
 *   const registerSchema = {
 *     body: Joi.object({
 *       email: Joi.string().email().required(),
 *       password: Joi.string().min(8).required(),
 *     }),
 *   };
 *
 *   router.post('/register', validate(registerSchema), authController.register);
 *
 * `schemas` is an object keyed by request part — any of `body`, `params`,
 * `query` — each value a Joi schema. Only the parts you pass a schema for
 * are validated; omitted parts are left alone. This keeps the middleware
 * generic enough for every future route (auth, sessions, reviews, ...)
 * without route modules needing their own bespoke validation wiring.
 */

const VALIDATABLE_SOURCES = ['body', 'params', 'query'];

const JOI_VALIDATE_OPTIONS = {
  abortEarly: false, // collect every invalid field in one response, not just the first
  stripUnknown: true, // drop fields the schema doesn't define, rather than rejecting the whole request
  errors: { wrap: { label: false } }, // "email" is required, not '"email" is required'
};

export function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    VALIDATABLE_SOURCES.forEach((source) => {
      const schema = schemas[source];
      if (!schema) return;

      const { error, value } = schema.validate(req[source], JOI_VALIDATE_OPTIONS);

      if (error) {
        error.details.forEach((detail) => {
          errors.push({
            field: detail.path.join('.') || source,
            message: detail.message,
          });
        });
        return;
      }

      // Express 4: req.body/req.params/req.query are plain writable
      // properties, so reassigning with the validated (and stripUnknown'd)
      // value is safe. This would need a different approach under Express 5,
      // where req.query is a read-only getter — not a concern on the
      // Express 4.19 this project is pinned to.
      req[source] = value;
    });

    if (errors.length > 0) {
      // Deliberately returns only field + message per error — no Joi
      // internals, no stack trace, nothing that reveals schema shape
      // beyond what the client needs to fix their own request.
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    return next();
  };
}

export default validate;
