import jwt from 'jsonwebtoken';
import { UserRole } from '../db/schema/users';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

function getAccessSecret(): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error('ACCESS_TOKEN_SECRET is not set');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not set');
  return secret;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']) || '15m',
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']) || '7d',
  });
}

export function generateTokenPair(payload: TokenPayload): Tokens {
  return {
    access_token: generateAccessToken(payload),
    refresh_token: generateRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
}
