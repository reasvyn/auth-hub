import type { User, UserProfile, UserSettings } from '@reasvyn/auth-types';

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
  list(params?: { page?: number; perPage?: number; role?: string; status?: string }): Promise<{ users: User[]; total: number }> {
    const query = new URLSearchParams(params as Record<string, string> ?? {}).toString();
    return this.http.get<{ users: User[]; total: number }>(`/users${query ? `?${query}` : ''}`);
  }

  /** Admin: get user by id */
  getById(userId: string): Promise<User> {
    return this.http.get<User>(`/users/${userId}`);
  }

  /** Admin: update user role/status */
  updateUser(userId: string, data: { role?: User['role']; status?: User['status'] }): Promise<User> {
    return this.http.patch<User>(`/users/${userId}`, data);
  }

  /** Admin: delete user */
  deleteUser(userId: string): Promise<void> {
    return this.http.delete<void>(`/users/${userId}`);
  }
}
