import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { ApiErrorResponse } from '../utils/response';

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errorMessages,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors — don't leak internals in production
  console.error('Unhandled error:', err);
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };
  res.status(404).json(response);
}
