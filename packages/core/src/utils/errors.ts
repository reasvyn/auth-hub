/**
 * Error handling utilities
 */

import { ErrorCode } from '@reasvyn/auth-types';

import type { AuthError } from '@reasvyn/auth-types';

export class AuthHubError extends Error {
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
    this.name = 'AuthHubError';
    this.code = code;
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }

  toJSON(): AuthError {
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
): AuthHubError {
  return new AuthHubError(code, message, statusCode, details);
}

export function isAuthHubError(error: unknown): error is AuthHubError {
  return error instanceof AuthHubError;
}

// Common error factories
export const Errors = {
  invalidCredentials: () =>
    new AuthHubError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401),

  sessionExpired: () =>
    new AuthHubError(ErrorCode.SESSION_EXPIRED, 'Session has expired', 401),

  tokenInvalid: (msg = 'Invalid token') =>
    new AuthHubError(ErrorCode.TOKEN_INVALID, msg, 401),

  tokenExpired: () =>
    new AuthHubError(ErrorCode.TOKEN_EXPIRED, 'Token has expired', 401),

  emailNotVerified: () =>
    new AuthHubError(ErrorCode.EMAIL_NOT_VERIFIED, 'Email address not verified', 403),

  emailAlreadyExists: () =>
    new AuthHubError(ErrorCode.EMAIL_ALREADY_EXISTS, 'An account with this email already exists', 409),

  rateLimitExceeded: (retryAfter?: number) =>
    new AuthHubError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests, please try again later',
      429,
      retryAfter ? { retryAfter } : undefined,
    ),

  mfaRequired: (mfaToken: string) =>
    new AuthHubError(ErrorCode.MFA_REQUIRED, 'Multi-factor authentication is required', 403, {
      mfaToken,
    }),

  mfaCodeInvalid: () =>
    new AuthHubError(ErrorCode.MFA_CODE_INVALID, 'Invalid MFA code', 401),

  csrfTokenInvalid: () =>
    new AuthHubError(ErrorCode.CSRF_TOKEN_INVALID, 'Invalid CSRF token', 403),

  unauthorized: (msg = 'Unauthorized') =>
    new AuthHubError(ErrorCode.UNAUTHORIZED, msg, 401),

  forbidden: (msg = 'Forbidden') =>
    new AuthHubError(ErrorCode.FORBIDDEN, msg, 403),

  notFound: (resource = 'Resource') =>
    new AuthHubError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  internal: (msg = 'Internal server error') =>
    new AuthHubError(ErrorCode.INTERNAL_ERROR, msg, 500),
};
