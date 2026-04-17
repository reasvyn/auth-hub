/**
 * OAuth-related type definitions
 */

export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | 'microsoft';

export interface OAuthConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string[];
  additionalParams?: Record<string, string>;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export interface OAuthUserProfile {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  raw: Record<string, unknown>;
}

export interface OAuthState {
  provider: OAuthProvider;
  redirectUrl?: string;
  nonce?: string;
  codeVerifier?: string;
}

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
  codeVerifier?: string;
}
