/**
 * OAuth2 flow utilities
 */

import { randomBytes, createHash } from 'crypto';

import type { OAuthAuthorizationUrl, OAuthProvider, OAuthState } from '@reasvyn/auth-types';

export interface OAuthFlowOptions {
  clientId: string;
  redirectUri: string;
  scope?: string[];
  state?: string;
  usePKCE?: boolean;
}

const PROVIDER_AUTHORIZATION_URLS: Record<OAuthProvider, string> = {
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  github: 'https://github.com/login/oauth/authorize',
  facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
  twitter: 'https://twitter.com/i/oauth2/authorize',
  discord: 'https://discord.com/api/oauth2/authorize',
  microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
};

const DEFAULT_SCOPES: Record<OAuthProvider, string[]> = {
  google: ['openid', 'email', 'profile'],
  github: ['user:email', 'read:user'],
  facebook: ['email', 'public_profile'],
  twitter: ['tweet.read', 'users.read'],
  discord: ['identify', 'email'],
  microsoft: ['openid', 'email', 'profile', 'User.Read'],
};

/**
 * Generate the OAuth2 authorization URL for a provider
 */
export function getOAuthAuthorizationUrl(
  provider: OAuthProvider,
  options: OAuthFlowOptions,
): OAuthAuthorizationUrl {
  const { clientId, redirectUri, scope, usePKCE = false } = options;

  const state = options.state ?? randomBytes(16).toString('hex');
  const scopes = scope ?? DEFAULT_SCOPES[provider];
  const baseUrl = PROVIDER_AUTHORIZATION_URLS[provider];

  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (usePKCE) {
    codeVerifier = randomBytes(32).toString('base64url');
    codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    ...(codeChallenge && {
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }),
  });

  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return {
    url: `${baseUrl}?${params.toString()}`,
    state,
    ...(codeVerifier ? { codeVerifier } : {}),
  };
}

/**
 * Serialize OAuth state for storage
 */
export function serializeOAuthState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Deserialize OAuth state from storage
 */
export function deserializeOAuthState(serialized: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8')) as OAuthState;
  } catch {
    return null;
  }
}
