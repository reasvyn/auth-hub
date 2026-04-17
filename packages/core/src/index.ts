/**
 * @auth-hub/core - Core Authentication Logic
 *
 * Framework-agnostic authentication utilities.
 */

// Auth utilities
export * from './auth/jwt';
export * from './auth/magic-link';
export * from './auth/email-verification';
export * from './auth/oauth';

// Security utilities
export * from './security/password';
export * from './security/rate-limiter';
export * from './security/csrf';
export * from './security/totp';
export * from './security/brute-force';

// Utility helpers
export * from './utils/errors';
export * from './utils/validation';
export * from './utils/logger';
export * from './utils/constants';
