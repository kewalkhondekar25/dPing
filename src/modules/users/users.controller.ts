import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';

const updateProfileSchema = z.object({
  display_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  profile_image_url: z.union([z.literal(''), z.string().url('Invalid URL format')]).optional(),
  dm_price_lamports: z
    .string()
    .regex(/^\d+$/, 'dm_price_lamports must be a non-negative integer (lamports)')
    .optional(),
});

const updateCreatorProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  display_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  profile_image_url: z.union([z.literal(''), z.string().url('Invalid URL format')]).optional(),
  dm_price_lamports: z
    .string()
    .regex(/^\d+$/, 'dm_price_lamports must be a non-negative integer (lamports)')
    .optional(),
});

const updateWalletSchema = z.object({
  wallet_address: z.union([z.literal(''), z.string().min(10, 'Invalid wallet address')]),
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

export async function updateCreatorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateCreatorProfileSchema.parse(req.body);
    const user = await usersService.updateCreatorProfile(req.user!.id, req.user!.role, input);
    sendSuccess(res, user, 200, 'Creator profile updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateWalletSchema.parse(req.body);
    const user = await usersService.updateWalletAddress(req.user!.id, input.wallet_address);
    sendSuccess(res, user, 200, 'Wallet address updated successfully');
  } catch (err) {
    next(err);
  }
}
