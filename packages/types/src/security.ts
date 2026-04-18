/**
 * Security-related type definitions
 */

import type { UserStatus, TwoFactorMethod } from './user';

export interface MFASetupData {
  method: TwoFactorMethod;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  email?: string;
}

export interface MFAVerifyData {
  code: string;
  method: TwoFactorMethod;
}

export type SecurityMethodType = 'password' | 'totp' | 'email_otp' | 'sms_otp' | 'recovery_code';

export type SecurityMethodStatus = 'pending' | 'enabled' | 'disabled' | 'locked' | 'compromised';

export interface PasswordCredential {
  userId: string;
  email: string;
  passwordHash: string;
  passwordUpdatedAt: Date;
  failedLoginAttempts: number;
  requirePasswordChange?: boolean;
  lockedUntil?: Date;
  compromisedAt?: Date;
}

export interface UserSecurityMethod {
  id: string;
  userId: string;
  type: SecurityMethodType;
  status: SecurityMethodStatus;
  label?: string;
  isPrimary: boolean;
  redactedDestination?: string;
  verifiedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface RecoveryCode {
  id: string;
  hint: string;
  createdAt: Date;
  usedAt?: Date;
}

export type OneTimeCodePurpose =
  | 'email_verification'
  | 'password_reset'
  | 'signin_challenge'
  | 'mfa_challenge'
  | 'security_method_enrollment'
  | 'security_method_verification';

export interface OneTimeCodeChallenge {
  id: string;
  purpose: OneTimeCodePurpose;
  method: TwoFactorMethod;
  userId?: string;
  destination?: string;
  expiresAt: Date;
  attemptsRemaining: number;
  verifiedAt?: Date;
  consumedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StoredOneTimeCodeChallenge extends Omit<
  OneTimeCodeChallenge,
  'userId' | 'destination'
> {
  userId: string;
  destination: string;
  codeHash: string;
}

export interface UserSecurityOverview {
  userId: string;
  userStatus: UserStatus;
  emailVerified: boolean;
  passwordConfigured: boolean;
  passwordLastChangedAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  methods: UserSecurityMethod[];
  recoveryCodesRemaining: number;
  lastSecurityReviewAt?: Date;
  recommendations: string[];
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

export interface ConfigureSecurityMethodRequest {
  method: SecurityMethodType;
  label?: string;
  destination?: string;
  isPrimary?: boolean;
}

export interface VerifySecurityMethodRequest {
  methodId: string;
  code: string;
  challengeId?: string;
}

export interface DisableSecurityMethodRequest {
  methodId: string;
  verificationCode?: string;
  password?: string;
}

export interface RequestOneTimeCodeRequest {
  purpose: OneTimeCodePurpose;
  method: TwoFactorMethod;
  destination?: string;
  context?: Record<string, unknown>;
}

export interface VerifyOneTimeCodeRequest {
  challengeId: string;
  code: string;
}

export interface RegenerateRecoveryCodesRequest {
  password: string;
  verificationCode?: string;
}

export interface RegenerateRecoveryCodesResponse {
  generatedAt: Date;
  codes: string[];
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
  | 'otp_challenge_requested'
  | 'otp_challenge_verified'
  | 'otp_challenge_failed'
  | 'otp_challenge_expired'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_revoked';

export interface AnomalyScore {
  score: number;
  reasons: string[];
  isSuspicious: boolean;
}
