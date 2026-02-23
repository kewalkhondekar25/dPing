import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/response';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  role: z.enum(['creator', 'audience'], {
    errorMap: () => ({ message: 'Role must be either "creator" or "audience"' }),
  }),
  display_name: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerUser(input);
    sendCreated(res, result, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginUser(input);
    sendSuccess(res, result, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token } = refreshSchema.parse(req.body);
    const result = await authService.refreshTokens(refresh_token);
    sendSuccess(res, result, 200, 'Tokens refreshed successfully');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logoutUser(req.user!.id);
    sendSuccess(res, null, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}
