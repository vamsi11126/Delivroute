import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { ApiError } from './errors';

/** Claims embedded in the access token and attached to `req.user`. */
export interface AccessTokenPayload {
  id: string;
  role: Role;
  storeId: string | null;
}

const ACCESS_TOKEN_TTL = '15m';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
}

/** Sign a short-lived (15 min) HS256 access token. */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

/** Verify an access token, returning its claims. Throws ApiError(401) if invalid. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload & AccessTokenPayload;
    return {
      id: decoded.id,
      role: decoded.role,
      storeId: decoded.storeId ?? null,
    };
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
