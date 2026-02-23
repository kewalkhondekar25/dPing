import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  profile_image_url: z.string().url('Invalid URL format').optional(),
  dm_price_usd: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'dm_price_usd must be a valid decimal number (e.g., "5.00")')
    .optional(),
});

export async function getAllCreators(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const creators = await usersService.getAllCreators();
    sendSuccess(res, creators);
  } catch (err) {
    next(err);
  }
}

export async function getCreatorByUsername(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const username = String(req.params.username);
    const creator = await usersService.getCreatorByUsername(username);
    sendSuccess(res, creator);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getCurrentUser(req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await usersService.updateCurrentUser(req.user!.id, req.user!.role, input);
    sendSuccess(res, user, 200, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}
