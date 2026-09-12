const ApiError = require('../utils/ApiError');

// Usage: validate({ body: someZodSchema, params: otherSchema, query: ... })
// Replaces req.body/params/query with the parsed (and coerced) values so
// downstream handlers can trust their shape.
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      const details = err.errors
        ? err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        : undefined;
      next(ApiError.badRequest('Validation failed', details));
    }
  };
}

module.exports = validate;
