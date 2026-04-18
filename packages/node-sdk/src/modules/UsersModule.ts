import type {
  ConfigureSecurityMethodRequest,
  DisableSecurityMethodRequest,
  OneTimeCodeChallenge,
  RegenerateRecoveryCodesRequest,
  RegenerateRecoveryCodesResponse,
  User,
  UserProfile,
  UserSecurityMethod,
  UserSecurityOverview,
  UserSettings,
  VerifyOneTimeCodeRequest,
  VerifySecurityMethodRequest,
  RequestOneTimeCodeRequest,
  SecurityEvent,
} from '@reasvyn/auth-types';

import type { HttpClient } from '../http/HttpClient';

export class UsersModule {
  constructor(private http: HttpClient) {}

  me(): Promise<User> {
    return this.http.get<User>('/users/me');
  }

  updateProfile(data: Partial<UserProfile>): Promise<User> {
    return this.http.patch<User>('/users/me/profile', data);
  }

  updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    return this.http.patch<UserSettings>('/users/me/settings', data);
  }

  updateAvatar(avatarUrl: string): Promise<User> {
    return this.http.patch<User>('/users/me/avatar', { avatarUrl });
  }

  deleteAccount(password: string): Promise<void> {
    return this.http.delete<void>(`/users/me?password=${encodeURIComponent(password)}`);
  }

  /** Admin: list all users */
  list(params?: {
    page?: number;
    perPage?: number;
    role?: string;
    status?: string;
  }): Promise<{ users: User[]; total: number }> {
    const query = new URLSearchParams((params as Record<string, string>) ?? {}).toString();
    return this.http.get<{ users: User[]; total: number }>(`/users${query ? `?${query}` : ''}`);
  }

  /** Admin: get user by id */
  getById(userId: string): Promise<User> {
    return this.http.get<User>(`/users/${userId}`);
  }

  /** Admin: update user role/status */
  updateUser(
    userId: string,
    data: { role?: User['role']; status?: User['status'] },
  ): Promise<User> {
    return this.http.patch<User>(`/users/${userId}`, data);
  }

  /** Admin: delete user */
  deleteUser(userId: string): Promise<void> {
    return this.http.delete<void>(`/users/${userId}`);
  }

  getSecurityOverview(): Promise<UserSecurityOverview> {
    return this.http.get<UserSecurityOverview>('/users/me/security');
  }

  listSecurityMethods(): Promise<UserSecurityMethod[]> {
    return this.http.get<UserSecurityMethod[]>('/users/me/security/methods');
  }

  configureSecurityMethod(data: ConfigureSecurityMethodRequest): Promise<UserSecurityMethod> {
    return this.http.post<UserSecurityMethod>('/users/me/security/methods', data);
  }

  verifySecurityMethod(
    methodId: string,
    data: Omit<VerifySecurityMethodRequest, 'methodId'>,
  ): Promise<UserSecurityMethod> {
    return this.http.post<UserSecurityMethod>(
      `/users/me/security/methods/${methodId}/verify`,
      data,
    );
  }

  disableSecurityMethod(
    methodId: string,
    data: Omit<DisableSecurityMethodRequest, 'methodId'> = {},
  ): Promise<void> {
    return this.http.post<void>(`/users/me/security/methods/${methodId}/disable`, data);
  }

  requestOneTimeCode(data: RequestOneTimeCodeRequest): Promise<OneTimeCodeChallenge> {
    return this.http.post<OneTimeCodeChallenge>('/users/me/security/challenges', data);
  }

  verifyOneTimeCode(
    data: VerifyOneTimeCodeRequest,
  ): Promise<{ verified: boolean; challenge: OneTimeCodeChallenge }> {
    return this.http.post<{ verified: boolean; challenge: OneTimeCodeChallenge }>(
      '/users/me/security/challenges/verify',
      data,
    );
  }

  regenerateRecoveryCodes(
    data: RegenerateRecoveryCodesRequest,
  ): Promise<RegenerateRecoveryCodesResponse> {
    return this.http.post<RegenerateRecoveryCodesResponse>(
      '/users/me/security/recovery-codes',
      data,
    );
  }

  listSecurityEvents(params?: {
    limit?: number;
    cursor?: string;
    types?: string[];
  }): Promise<{ items: SecurityEvent[]; nextCursor?: string }> {
    const query = new URLSearchParams();

    if (params?.limit !== undefined) {
      query.set('limit', String(params.limit));
    }

    if (params?.cursor !== undefined) {
      query.set('cursor', params.cursor);
    }

    if (params?.types !== undefined) {
      for (const type of params.types) {
        query.append('types', type);
      }
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    return this.http.get<{ items: SecurityEvent[]; nextCursor?: string }>(
      `/users/me/security/events${suffix}`,
    );
  }
}
