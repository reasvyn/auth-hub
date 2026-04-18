/**
 * JWT token-related type definitions
 */

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  sessionId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
  [key: string]: unknown;
}

export interface TokenMetadata {
  tokenId: string;
  userId: string;
  type: TokenType;
  expiresAt: Date;
  issuedAt: Date;
  isRevoked: boolean;
  sessionId?: string;
  issuedByIpAddress?: string;
  issuedToDeviceFingerprint?: string;
  revokedAt?: Date;
}

export type TokenType =
  | 'access'
  | 'refresh'
  | 'magic_link'
  | 'email_verification'
  | 'password_reset'
  | 'mfa'
  | 'otp'
  | 'login_challenge'
  | 'security_method_verification'
  | 'csrf';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: 'Bearer';
}

export interface VerifyEmailToken {
  email: string;
  userId: string;
  token: string;
  expiresAt: Date;
}
