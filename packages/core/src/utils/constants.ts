/**
 * Constants and configuration defaults
 */

export const AUTH_CONSTANTS = {
  // Token expiry defaults
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAGIC_LINK_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes
  EMAIL_VERIFICATION_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  CSRF_TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour

  // Rate limiting defaults
  LOGIN_RATE_LIMIT_MAX: 5,
  LOGIN_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  REGISTER_RATE_LIMIT_MAX: 3,
  REGISTER_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  API_RATE_LIMIT_MAX: 100,
  API_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute

  // Password hashing
  BCRYPT_ROUNDS: 12,

  // TOTP
  TOTP_DIGITS: 6,
  TOTP_PERIOD: 30,
  TOTP_WINDOW: 1,
  BACKUP_CODE_COUNT: 10,
  RECOVERY_CODE_SEGMENTS: 2,
  RECOVERY_CODE_SEGMENT_LENGTH: 5,
  ONE_TIME_CODE_LENGTH: 6,
  ONE_TIME_CODE_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  ONE_TIME_CODE_MAX_ATTEMPTS: 5,
  PASSWORD_REVIEW_INTERVAL_MS: 90 * 24 * 60 * 60 * 1000, // 90 days

  // Session
  SESSION_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // Brute force protection
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
} as const;

export const SUPPORTED_OAUTH_PROVIDERS = [
  'google',
  'github',
  'facebook',
  'twitter',
  'discord',
  'microsoft',
] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
