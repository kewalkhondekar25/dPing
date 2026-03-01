import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users, User } from '../../db/schema/users';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';

export type PublicCreatorProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  dm_price_lamports: string;
  wallet_address: string | null;
};

export type SafeUser = Omit<User, 'password_hash' | 'dm_price_lamports'> & {
  dm_price_lamports: string;
};

function toSafeUser(user: User): SafeUser {
  const { password_hash: _ph, dm_price_lamports, ...safe } = user;
  return { ...safe, dm_price_lamports: String(dm_price_lamports) };
}

function toPublicCreator(user: User): PublicCreatorProfile {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    profile_image_url: user.profile_image_url,
    dm_price_lamports: String(user.dm_price_lamports),
    wallet_address: user.wallet_address,
  };
}

export async function getAllCreators(): Promise<PublicCreatorProfile[]> {
  const creators = await db
    .select()
    .from(users)
    .where(eq(users.role, 'creator'));

  return creators
    .filter((c) => c.is_active && c.wallet_address)
    .map(toPublicCreator);
}

export async function getCreatorByUsername(username: string): Promise<PublicCreatorProfile> {
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!creator || creator.role !== 'creator') {
    throw new NotFoundError('Creator');
  }

  if (!creator.is_active) {
    throw new NotFoundError('Creator');
  }

  return toPublicCreator(creator);
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  return toSafeUser(user);
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  // TODO [Solana]: Add wallet_address update for Solana wallet linking
  dm_price_lamports?: string;
}

export interface UpdateCreatorProfileInput {
  username?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  dm_price_lamports?: string;
}

export async function updateCreatorProfile(
  userId: string,
  userRole: string,
  input: UpdateCreatorProfileInput,
): Promise<SafeUser> {
  if (userRole !== 'creator') {
    throw new ForbiddenError('Only creators can update these profile details');
  }

  if (input.dm_price_lamports !== undefined) {
    const lamports = BigInt(input.dm_price_lamports);
    if (lamports < 0n) {
      throw new ValidationError('dm_price_lamports must be a non-negative integer');
    }
  }

  if (input.username !== undefined) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, input.username.toLowerCase()))
      .limit(1);

    if (existingUser && existingUser.id !== userId) {
      throw new ValidationError('Username is already taken');
    }
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updated_at: new Date(),
  };

  if (input.username !== undefined) updateData.username = input.username.toLowerCase();
  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.profile_image_url !== undefined) updateData.profile_image_url = input.profile_image_url;
  if (input.dm_price_lamports !== undefined) updateData.dm_price_lamports = BigInt(input.dm_price_lamports);

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError('User');
  }

  return toSafeUser(updated);
}

export async function updateWalletAddress(userId: string, walletAddress: string): Promise<SafeUser> {
  const [updated] = await db
    .update(users)
    .set({
      wallet_address: walletAddress,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError('User');
  }

  return toSafeUser(updated);
}

export async function updateCurrentUser(
  userId: string,
  userRole: string,
  input: UpdateProfileInput,
): Promise<SafeUser> {
  // Only creators can update dm_price_lamports
  if (input.dm_price_lamports !== undefined && userRole !== 'creator') {
    throw new ForbiddenError('Only creators can set a DM price');
  }

  if (input.dm_price_lamports !== undefined) {
    const lamports = BigInt(input.dm_price_lamports);
    if (lamports < 0n) {
      throw new ValidationError('dm_price_lamports must be a non-negative integer');
    }
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updated_at: new Date(),
  };

  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.profile_image_url !== undefined) updateData.profile_image_url = input.profile_image_url;
  if (input.dm_price_lamports !== undefined) updateData.dm_price_lamports = BigInt(input.dm_price_lamports);

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError('User');
  }

  return toSafeUser(updated);
}
