/**
 * Request validation middleware using Zod
 * Compatible with Express 5 getter properties
 */
export function validate({ body, query, params }) {
  return async (req, res, next) => {
    try {
      if (body) {
        const parsedBody = await body.parseAsync(req.body);
        try {
          req.body = parsedBody;
        } catch {
          Object.defineProperty(req, 'body', {
            value: parsedBody,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if (query) {
        const parsedQuery = await query.parseAsync(req.query);
        try {
          req.query = parsedQuery;
        } catch {
          Object.defineProperty(req, 'query', {
            value: parsedQuery,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if (params) {
        const parsedParams = await params.parseAsync(req.params);
        try {
          req.params = parsedParams;
        } catch {
          Object.defineProperty(req, 'params', {
            value: parsedParams,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;
