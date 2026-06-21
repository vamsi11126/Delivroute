import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/errors';

/**
 * Validates `req.body` against a Zod schema before the controller runs.
 * On success, replaces `req.body` with the parsed (and coerced) data.
 * On failure, forwards a 400 VALIDATION_ERROR.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      return next(new ApiError(400, 'VALIDATION_ERROR', message));
    }
    req.body = result.data;
    next();
  };
}
