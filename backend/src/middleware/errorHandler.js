import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res, next) {
  return errorResponse(res, `Route '${req.originalUrl}' not found`, 404, 'NOT_FOUND');
}

export function errorHandler(err, req, res, next) {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return errorResponse(res, 'Validation failed for request data', 400, 'VALIDATION_ERROR', formattedIssues);
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle SQLite constraint and DB errors
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('UNIQUE constraint failed')) {
      return errorResponse(
        res,
        'Duplicate entry: a record with these unique values already exists.',
        409,
        'DUPLICATE_ENTRY'
      );
    }
    if (err.message.includes('FOREIGN KEY constraint failed')) {
      return errorResponse(
        res,
        'Referential integrity conflict: cannot modify or delete record due to related foreign key constraints.',
        409,
        'FOREIGN_KEY_CONFLICT'
      );
    }
    if (err.message.includes('CHECK constraint failed')) {
      return errorResponse(
        res,
        'Check constraint violated: one or more values exceed allowed boundaries.',
        400,
        'CHECK_CONSTRAINT_VIOLATED'
      );
    }
  }

  // Handle MySQL errors safely without leaking sensitive server info
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return errorResponse(
          res,
          'Duplicate entry: a record with these unique values already exists.',
          409,
          'DUPLICATE_ENTRY'
        );
      case 'ER_NO_REFERENCED_ROW_2':
        return errorResponse(
          res,
          'Referential integrity error: referenced parent record does not exist.',
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      case 'ER_ROW_IS_REFERENCED_2':
        return errorResponse(
          res,
          'Cannot delete or update this record because related child records depend on it.',
          409,
          'FOREIGN_KEY_RESTRICTION'
        );
      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        return errorResponse(
          res,
          'Check constraint violated: one or more values exceed allowed boundaries.',
          400,
          'CHECK_CONSTRAINT_VIOLATED'
        );
      case 'ECONNREFUSED':
      case 'ER_ACCESS_DENIED_ERROR':
      case 'PROTOCOL_CONNECTION_LOST':
        return errorResponse(
          res,
          'Database connectivity is currently unavailable. Please verify database service.',
          503,
          'DATABASE_UNAVAILABLE'
        );
      default:
        break;
    }
  }

  // Fallback internal server error
  console.error('[API Error]', err.message);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal server error';

  return errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR');
}

export default {
  AppError,
  notFoundHandler,
  errorHandler,
};
