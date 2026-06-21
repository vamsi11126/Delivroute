/**
 * Application error carrying an HTTP status and a machine-readable error code.
 * The global error handler maps this to the standard error envelope:
 *   { success: false, error: { code, message } }
 *
 * Codes align with the table in CLAUDE.md (VALIDATION_ERROR, UNAUTHORIZED,
 * FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR, ...).
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
