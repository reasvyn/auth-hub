/**
 * Error handling utilities
 */

import { ErrorCode } from '@reasvyn/auth-types';
import type { AuthError as SerializedAuthError } from '@reasvyn/auth-types';

export class AuthError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }

  toJSON(): SerializedAuthError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
      statusCode: this.statusCode,
      timestamp: new Date(),
    };
  }
}

export function createAuthError(
  code: ErrorCode,
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>,
): AuthError {
  return new AuthError(code, message, statusCode, details);
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

// Common error factories
export const Errors = {
  invalidCredentials: () =>
    new AuthError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401),

  sessionExpired: () => new AuthError(ErrorCode.SESSION_EXPIRED, 'Session has expired', 401),

  tokenInvalid: (msg = 'Invalid token') => new AuthError(ErrorCode.TOKEN_INVALID, msg, 401),

  tokenExpired: () => new AuthError(ErrorCode.TOKEN_EXPIRED, 'Token has expired', 401),

  emailNotVerified: () =>
    new AuthError(ErrorCode.EMAIL_NOT_VERIFIED, 'Email address not verified', 403),

  emailAlreadyExists: () =>
    new AuthError(ErrorCode.EMAIL_ALREADY_EXISTS, 'An account with this email already exists', 409),

  rateLimitExceeded: (retryAfter?: number) =>
    new AuthError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests, please try again later',
      429,
      retryAfter ? { retryAfter } : undefined,
    ),

  mfaRequired: (mfaToken: string) =>
    new AuthError(ErrorCode.MFA_REQUIRED, 'Multi-factor authentication is required', 403, {
      mfaToken,
    }),

  mfaCodeInvalid: () => new AuthError(ErrorCode.MFA_CODE_INVALID, 'Invalid MFA code', 401),

  csrfTokenInvalid: () => new AuthError(ErrorCode.CSRF_TOKEN_INVALID, 'Invalid CSRF token', 403),

  unauthorized: (msg = 'Unauthorized') => new AuthError(ErrorCode.UNAUTHORIZED, msg, 401),

  forbidden: (msg = 'Forbidden') => new AuthError(ErrorCode.FORBIDDEN, msg, 403),

  notFound: (resource = 'Resource') =>
    new AuthError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  internal: (msg = 'Internal server error') => new AuthError(ErrorCode.INTERNAL_ERROR, msg, 500),
};
