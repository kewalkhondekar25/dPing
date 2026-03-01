import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users, NewUser, User, UserRole } from '../../db/schema/users';
import { generateTokenPair, verifyRefreshToken, Tokens, TokenPayload } from '../../utils/jwt';
import {
  ConflictError,
  UnauthorizedError,
} from '../../utils/errors';

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  role: UserRole;
  display_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password_hash' | 'dm_price_lamports'> & {
    dm_price_lamports: string;
  };
  tokens: Tokens;
}

const SALT_ROUNDS = 12;

function sanitizeUser(user: User): Omit<User, 'password_hash' | 'dm_price_lamports'> & { dm_price_lamports: string } {
  const { password_hash: _ph, dm_price_lamports, ...safeUser } = user;
  return { ...safeUser, dm_price_lamports: String(dm_price_lamports) };
}

function buildTokenPayload(user: User): TokenPayload {
  return { id: user.id, email: user.email, role: user.role };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const { email, password, username, role, display_name } = input;

  // Check for existing email or username
  const [existingEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existingEmail) {
    throw new ConflictError('An account with this email already exists');
  }

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (existingUsername) {
    throw new ConflictError('This username is already taken');
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser: NewUser = {
    email: email.toLowerCase(),
    password_hash,
    role,
    username: username.toLowerCase(),
    display_name: display_name || username,
    dm_price_lamports: role === 'creator' ? 5000000000n : 0n, // 5 SOL default for creators
  };

  const [created] = await db.insert(users).values(newUser).returning();

  const tokens = generateTokenPair(buildTokenPayload(created));

  return { user: sanitizeUser(created), tokens };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('This account has been deactivated');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = generateTokenPair(buildTokenPayload(user));

  return { user: sanitizeUser(user), tokens };
}

export async function refreshTokens(refreshToken: string): Promise<{ tokens: Tokens }> {
  let payload: TokenPayload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);

  if (!user || !user.is_active) {
    throw new UnauthorizedError('User no longer exists or is inactive');
  }

  const tokens = generateTokenPair(buildTokenPayload(user));
  return { tokens };
}

export async function logoutUser(_userId: string): Promise<void> {
  // NOTE: In a stateless JWT setup, logout is handled client-side by discarding the token.
  // For production, implement a token blocklist (Redis) here.
  // TODO [Solana]: If using wallet-based sessions, revoke wallet session here.
  return;
}

export { sanitizeUser };
