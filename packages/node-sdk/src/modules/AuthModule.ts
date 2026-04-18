import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  MagicLinkRequest,
  MFAVerifyRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  OAuthProvider,
  TwoFactorMethod,
} from '@reasvyn/auth-types';

import type { HttpClient } from '../http/HttpClient';

export class AuthModule {
  constructor(private http: HttpClient) {}

  login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', credentials);
  }

  register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/register', credentials);
  }

  logout(refreshToken?: string): Promise<void> {
    return this.http.post<void>('/auth/logout', refreshToken ? { refreshToken } : undefined);
  }

  refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    } satisfies RefreshTokenRequest);
  }

  sendMagicLink(email: string): Promise<void> {
    return this.http.post<void>('/auth/magic-link', { email } satisfies MagicLinkRequest);
  }

  verifyMagicLink(token: string): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/magic-link/verify', { token });
  }

  sendEmailVerification(): Promise<void> {
    return this.http.post<void>('/auth/email/send-verification');
  }

  verifyEmail(token: string): Promise<void> {
    return this.http.post<void>('/auth/email/verify', { token });
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.http.post<void>('/auth/password/reset', { email } satisfies PasswordResetRequest);
  }

  confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    return this.http.post<void>('/auth/password/reset/confirm', {
      token,
      newPassword,
    } satisfies PasswordResetConfirmRequest);
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.http.post<void>('/auth/password/change', {
      currentPassword,
      newPassword,
    } satisfies ChangePasswordRequest);
  }

  getOAuthUrl(
    provider: OAuthProvider,
    redirectUri: string,
  ): Promise<{ url: string; state: string }> {
    return this.http.post<{ url: string; state: string }>('/auth/oauth/url', {
      provider,
      redirectUri,
    });
  }

  exchangeOAuthCode(provider: OAuthProvider, code: string, state: string): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/oauth/callback', { provider, code, state });
  }

  verifyMFA(code: string, method: TwoFactorMethod): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/mfa/verify', { code, method } satisfies Pick<
      MFAVerifyRequest,
      'code' | 'method'
    >);
  }
}
