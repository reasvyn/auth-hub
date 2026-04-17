/**
 * Authentication-related type definitions
 */

import type { OAuthProvider } from './oauth';
import type { TwoFactorMethod } from './user';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  acceptTerms?: boolean;
}

export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  requiresMfa?: boolean;
  mfaToken?: string;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface OAuthLoginRequest {
  provider: OAuthProvider;
  code: string;
  state?: string;
  redirectUri: string;
}

export interface MFAVerifyRequest {
  token: string;
  method: TwoFactorMethod;
  code: string;
}

export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
