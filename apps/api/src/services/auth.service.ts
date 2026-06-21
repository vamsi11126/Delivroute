import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { signAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { RegisterStoreInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

/** Fields safe to return in any API response (never includes passwordHash). */
const userSafeSelect = {
  id: true,
  storeId: true,
  role: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
} as const;

interface TokenSubject {
  id: string;
  role: Role;
  storeId: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Issue an access token + a rotating refresh token (stored in Redis). */
async function issueTokens(user: TokenSubject): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    id: user.id,
    role: user.role,
    storeId: user.storeId ?? null,
  });
  const refreshToken = uuidv4();
  await redis.set(`refresh:${refreshToken}`, user.id, 'EX', REFRESH_TTL_SECONDS);
  return { accessToken, refreshToken };
}

/**
 * Register a new store and its owner in a single transaction.
 * The Store/User pair has circular FKs, so we create the owner, then the
 * store, then back-link the owner's storeId.
 */
export async function registerStore(data: RegisterStoreInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'Email or phone is already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const { user, store } = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        role: Role.store_owner,
        name: data.ownerName,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
    });

    const createdStore = await tx.store.create({
      data: { name: data.storeName, ownerId: owner.id },
    });

    const linkedOwner = await tx.user.update({
      where: { id: owner.id },
      data: { storeId: createdStore.id },
      select: userSafeSelect,
    });

    return { user: linkedOwner, store: createdStore };
  });

  const tokens = await issueTokens({ id: user.id, role: user.role, storeId: user.storeId });
  return { user, store, ...tokens };
}

/** Authenticate by email or phone, returning the safe user + tokens. */
export async function login(identifier: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      deletedAt: null,
    },
  });

  // Same generic message whether the user is missing, inactive, or the
  // password is wrong — avoids leaking which accounts exist.
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  const tokens = await issueTokens(user);
  const { passwordHash: _passwordHash, deletedAt: _deletedAt, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

/** Rotate a refresh token: validate, delete the old, issue a fresh pair. */
export async function refresh(token: string): Promise<AuthTokens> {
  const key = `refresh:${token}`;
  const userId = await redis.get(key);
  if (!userId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  // Rotation: invalidate the presented token immediately.
  await redis.del(key);

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: userSafeSelect,
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User is no longer active');
  }

  return issueTokens(user);
}

/** Invalidate a refresh token (logout). Idempotent. */
export async function logout(token: string): Promise<void> {
  await redis.del(`refresh:${token}`);
}

/**
 * Generate a 6-digit OTP for a delivery boy invite and store it in Redis as
 * `otp:{phone}` → { otp, storeId } with a 10-minute TTL. The OTP is logged
 * (SMS delivery is wired up later). Returns the OTP for dev convenience.
 */
export async function generateOtp(phone: string, storeId: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A user with this phone already exists');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await redis.set(`otp:${phone}`, JSON.stringify({ otp, storeId }), 'EX', OTP_TTL_SECONDS);

  // TODO: send via SMS provider. For now, log it.
  logger.info(`OTP for ${phone}: ${otp}`);
  return otp;
}

/**
 * Verify an OTP and onboard the delivery boy under the store that invited
 * them. The storeId is taken from the Redis payload — never from the client.
 */
export async function verifyOtp(phone: string, otp: string, name: string, password: string) {
  const raw = await redis.get(`otp:${phone}`);
  if (!raw) {
    throw new ApiError(401, 'UNAUTHORIZED', 'OTP expired or not found');
  }

  const { otp: storedOtp, storeId } = JSON.parse(raw) as { otp: string; storeId: string };
  if (storedOtp !== otp) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid OTP');
  }

  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A user with this phone already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      role: Role.delivery_boy,
      name,
      phone,
      passwordHash,
      storeId,
    },
    select: userSafeSelect,
  });

  await redis.del(`otp:${phone}`);

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}
