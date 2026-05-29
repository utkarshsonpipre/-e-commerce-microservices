import jwt, { SignOptions } from 'jsonwebtoken';
import { optionalEnv, requireEnv } from './env';
import { UnauthorizedError } from './errors';

export type UserRole = 'customer' | 'admin';

/** Claims carried by access tokens. `sub` is the user id. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenClaims {
  sub: string;
  /** token version / id, lets us revoke refresh tokens if needed */
  tokenId: string;
}

function secret(): string {
  return requireEnv('JWT_SECRET');
}

export function signAccessToken(claims: AccessTokenClaims): string {
  const options: SignOptions = {
    expiresIn: optionalEnv('JWT_ACCESS_TTL', '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(claims, secret(), options);
}

export function signRefreshToken(claims: RefreshTokenClaims): string {
  const options: SignOptions = {
    expiresIn: optionalEnv('JWT_REFRESH_TTL', '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(claims, secret(), options);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, secret());
    return decoded as AccessTokenClaims;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, secret());
    return decoded as RefreshTokenClaims;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
