export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PAYMENT_REQUIRED'
  | 'ALREADY_EXISTS'
  | 'PAYMENT_NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'ALREADY_EXISTS');
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required to perform this action') {
    super(message, 402, 'PAYMENT_REQUIRED');
  }
}

export class PaymentNotFoundError extends AppError {
  constructor(message = 'Payment not found') {
    super(message, 404, 'PAYMENT_NOT_FOUND');
  }
}
