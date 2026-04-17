/**
 * JWT token utilities
 */

import jwt from 'jsonwebtoken';

import type { JWTPayload, TokenPair } from '@reasvyn/auth-types';

export interface JWTOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string | string[];
  jwtId?: string;
}

/**
 * Create a signed JWT token
 */
export function createJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  options: JWTOptions = {},
): string {
  const { expiresIn = '15m', issuer, audience, jwtId } = options;

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    ...(issuer && { issuer }),
    ...(audience && { audience }),
    ...(jwtId && { jwtid: jwtId }),
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string, secret: string, options: jwt.VerifyOptions = {}): JWTPayload {
  const decoded = jwt.verify(token, secret, options);
  return decoded as JWTPayload;
}

/**
 * Decode a JWT without verifying (for inspection only)
 */
export function decodeJWT(token: string): JWTPayload | null {
  const decoded = jwt.decode(token);
  return decoded as JWTPayload | null;
}

/**
 * Create an access + refresh token pair
 */
export function createTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  accessSecret: string,
  refreshSecret: string,
  options: {
    accessTokenExpiry?: string;
    refreshTokenExpiry?: string;
    issuer?: string;
    audience?: string | string[];
  } = {},
): TokenPair {
  const {
    accessTokenExpiry = '15m',
    refreshTokenExpiry = '7d',
    issuer,
    audience,
  } = options;

  const now = new Date();

  const accessToken = createJWT(payload, accessSecret, {
    expiresIn: accessTokenExpiry,
    issuer,
    audience,
  });

  const refreshToken = createJWT(
    { sub: payload.sub, email: payload.email, role: payload.role, type: 'refresh' },
    refreshSecret,
    { expiresIn: refreshTokenExpiry, issuer, audience },
  );

  const accessTokenExpiresAt = new Date(now.getTime() + parseDuration(accessTokenExpiry));
  const refreshTokenExpiresAt = new Date(now.getTime() + parseDuration(refreshTokenExpiry));

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    tokenType: 'Bearer',
  };
}

/**
 * Check if a JWT is expired
 */
export function isJWTExpired(token: string): boolean {
  try {
    const decoded = decodeJWT(token);
    if (!decoded?.exp) return false;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Parse a duration string to milliseconds (e.g. '15m', '7d', '1h')
 */
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration * 1000;
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 900_000; // default 15 min
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit] ?? 60_000);
}
