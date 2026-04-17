/**
 * User-related type definitions
 */

export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfile;
  settings?: UserSettings;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
}

export interface UserSettings {
  userId: string;
  language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: NotificationSettings;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

export type TwoFactorMethod = 'totp' | 'sms' | 'email';
