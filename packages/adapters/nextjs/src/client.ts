'use client';

/**
 * Client-side adapter factory for @reasvyn/auth-react.
 * Creates an AuthAdapter that calls your Next.js API routes.
 *
 * Usage:
 * ```tsx
 * import { AuthProvider } from '@reasvyn/auth-react';
 * import { createNextJsAdapter } from '@reasvyn/auth-nextjs/client';
 *
 * const adapter = createNextJsAdapter({ basePath: '/api/auth' });
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider adapter={adapter}>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
import type { AuthAdapter } from '@reasvyn/auth-react';
import type {
  ActiveSession,
  AuthResponse,
  MFASetupData,
  OAuthProvider,
  TwoFactorMethod,
  User,
} from '@reasvyn/auth-types';

export interface NextJsAdapterOptions {
  /** Base path for auth API routes. Default: '/api/auth' */
  basePath?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...((options?.headers as Record<string, string>) ?? {}) },
    ...options,
  });

  const data = await res.json() as { success: boolean; data?: T; error?: { message: string } };

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message ?? `Request failed: ${res.status}`);
  }

  return data.data as T;
}

export function createNextJsAdapter(options: NextJsAdapterOptions = {}): AuthAdapter {
  const base = (options.basePath ?? '/api/auth').replace(/\/$/, '');

  return {
    login: (credentials) =>
      apiFetch<AuthResponse>(`${base}/login`, { method: 'POST', body: JSON.stringify(credentials) }),

    register: (credentials) =>
      apiFetch<AuthResponse>(`${base}/register`, { method: 'POST', body: JSON.stringify(credentials) }),

    logout: (refreshToken) =>
      apiFetch<void>(`${base}/logout`, { method: 'POST', body: JSON.stringify({ refreshToken }) }),

    refreshToken: (token) =>
      apiFetch<AuthResponse>(`${base}/refresh`, { method: 'POST', body: JSON.stringify({ refreshToken: token }) }),

    getUser: () => apiFetch<User | null>(`${base}/me`).catch(() => null),

    sendMagicLink: (email) =>
      apiFetch<void>(`${base}/magic-link`, { method: 'POST', body: JSON.stringify({ email }) }),

    verifyMagicLink: (token) =>
      apiFetch<AuthResponse>(`${base}/magic-link/verify`, { method: 'POST', body: JSON.stringify({ token }) }),

    sendEmailVerification: () =>
      apiFetch<void>(`${base}/email/send-verification`, { method: 'POST' }),

    verifyEmail: (token) =>
      apiFetch<void>(`${base}/email/verify`, { method: 'POST', body: JSON.stringify({ token }) }),

    requestPasswordReset: (email) =>
      apiFetch<void>(`${base}/password/reset`, { method: 'POST', body: JSON.stringify({ email }) }),

    confirmPasswordReset: (token, newPassword) =>
      apiFetch<void>(`${base}/password/reset/confirm`, { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

    changePassword: (currentPassword, newPassword) =>
      apiFetch<void>(`${base}/password/change`, { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

    loginWithOAuth: async (provider: OAuthProvider) => {
      const { url } = await apiFetch<{ url: string }>(`${base}/oauth/url`, {
        method: 'POST',
        body: JSON.stringify({ provider, redirectUri: `${window.location.origin}/api/auth/oauth/callback` }),
      });
      window.location.href = url;
    },

    setupMFA: (method: TwoFactorMethod) =>
      apiFetch<MFASetupData>(`${base}/mfa/setup`, { method: 'POST', body: JSON.stringify({ method }) }),

    verifyMFA: (code: string, method: TwoFactorMethod) =>
      apiFetch<AuthResponse>(`${base}/mfa/verify`, { method: 'POST', body: JSON.stringify({ code, method }) }),

    disableMFA: (method: TwoFactorMethod, code: string) =>
      apiFetch<void>(`${base}/mfa/disable`, { method: 'POST', body: JSON.stringify({ method, code }) }),

    getSessions: () => apiFetch<ActiveSession[]>(`${base}/sessions`),

    revokeSession: (sessionId: string) =>
      apiFetch<void>(`${base}/sessions/${sessionId}`, { method: 'DELETE' }),

    revokeAllSessions: () =>
      apiFetch<void>(`${base}/sessions`, { method: 'DELETE' }),
  };
}
