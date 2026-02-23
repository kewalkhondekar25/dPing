import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void {
  const response: ApiResponse<T> = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, 201, message);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
