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
  dm_price_usd: string;
  // TODO [Solana]: Add wallet_address to public profile for Solana Pay QR generation
};

export type SafeUser = Omit<User, 'password_hash'>;

function toSafeUser(user: User): SafeUser {
  const { password_hash: _ph, ...safe } = user;
  return safe;
}

function toPublicCreator(user: User): PublicCreatorProfile {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    profile_image_url: user.profile_image_url,
    dm_price_usd: user.dm_price_usd,
  };
}

export async function getAllCreators(): Promise<PublicCreatorProfile[]> {
  const creators = await db
    .select()
    .from(users)
    .where(eq(users.role, 'creator'));

  return creators
    .filter((c) => c.is_active)
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
  dm_price_usd?: string;
}

export async function updateCurrentUser(
  userId: string,
  userRole: string,
  input: UpdateProfileInput,
): Promise<SafeUser> {
  // Only creators can update dm_price_usd
  if (input.dm_price_usd !== undefined && userRole !== 'creator') {
    throw new ForbiddenError('Only creators can set a DM price');
  }

  if (input.dm_price_usd !== undefined) {
    const price = parseFloat(input.dm_price_usd);
    if (isNaN(price) || price < 0) {
      throw new ValidationError('dm_price_usd must be a non-negative number');
    }
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updated_at: new Date(),
  };

  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.profile_image_url !== undefined) updateData.profile_image_url = input.profile_image_url;
  if (input.dm_price_usd !== undefined) updateData.dm_price_usd = input.dm_price_usd;

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
