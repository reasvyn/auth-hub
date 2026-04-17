/**
 * Security-related type definitions
 */

export interface MFASetupData {
  method: 'totp' | 'sms' | 'email';
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  email?: string;
}

export interface MFAVerifyData {
  code: string;
  method: 'totp' | 'sms' | 'email';
}

export interface DeviceInfo {
  fingerprint: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  language?: string;
  timezone?: string;
  screenResolution?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface CSRFToken {
  token: string;
  expiresAt: Date;
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'register'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verified'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_failed'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_revoked';

export interface AnomalyScore {
  score: number;
  reasons: string[];
  isSuspicious: boolean;
}
