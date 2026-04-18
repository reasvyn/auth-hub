import { ErrorCode } from '@reasvyn/auth-types';

import { AuthError, Errors, createAuthError, isAuthError } from '../utils/errors';

describe('AuthError', () => {
  it('is an instance of Error', () => {
    const err = new AuthError(ErrorCode.UNAUTHORIZED, 'Not allowed', 401);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthError);
  });

  it('sets name to "AuthError"', () => {
    const err = new AuthError(ErrorCode.UNAUTHORIZED, 'Not allowed', 401);
    expect(err.name).toBe('AuthError');
  });

  it('stores code, message, statusCode', () => {
    const err = new AuthError(ErrorCode.TOKEN_INVALID, 'Bad token', 401);
    expect(err.code).toBe(ErrorCode.TOKEN_INVALID);
    expect(err.message).toBe('Bad token');
    expect(err.statusCode).toBe(401);
  });

  it('defaults statusCode to 400 when omitted', () => {
    const err = new AuthError(ErrorCode.INVALID_CREDENTIALS, 'Oops');
    expect(err.statusCode).toBe(400);
  });

  it('stores details when provided', () => {
    const err = new AuthError(ErrorCode.MFA_REQUIRED, 'MFA needed', 403, { mfaToken: 'tok' });
    expect(err.details?.mfaToken).toBe('tok');
  });

  it('toJSON() returns an AuthError-shaped object', () => {
    const err = new AuthError(ErrorCode.FORBIDDEN, 'Go away', 403);
    const json = err.toJSON();
    expect(json.code).toBe(ErrorCode.FORBIDDEN);
    expect(json.message).toBe('Go away');
    expect(json.statusCode).toBe(403);
    expect(json.timestamp).toBeInstanceOf(Date);
  });
});

describe('createAuthError()', () => {
  it('returns an AuthError instance', () => {
    const err = createAuthError(ErrorCode.NOT_FOUND, 'Not found', 404);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(404);
  });
});

describe('isAuthError()', () => {
  it('returns true for AuthError instances', () => {
    expect(isAuthError(new AuthError(ErrorCode.UNAUTHORIZED, 'x', 401))).toBe(true);
  });

  it('returns false for plain errors', () => {
    expect(isAuthError(new Error('plain'))).toBe(false);
    expect(isAuthError('string')).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });
});

describe('Errors factories', () => {
  it('invalidCredentials returns 401', () => {
    const err = Errors.invalidCredentials();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCode.INVALID_CREDENTIALS);
  });

  it('tokenInvalid returns 401 with default message', () => {
    const err = Errors.tokenInvalid();
    expect(err.statusCode).toBe(401);
  });

  it('tokenInvalid accepts custom message', () => {
    const err = Errors.tokenInvalid('My custom message');
    expect(err.message).toBe('My custom message');
  });

  it('rateLimitExceeded returns 429', () => {
    const err = Errors.rateLimitExceeded(30);
    expect(err.statusCode).toBe(429);
    expect(err.details?.retryAfter).toBe(30);
  });

  it('mfaRequired returns 403 with mfaToken in details', () => {
    const err = Errors.mfaRequired('mfa_token_xyz');
    expect(err.statusCode).toBe(403);
    expect(err.details?.mfaToken).toBe('mfa_token_xyz');
  });

  it('notFound returns 404 with resource name', () => {
    const err = Errors.notFound('User');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('User');
  });

  it('internal returns 500', () => {
    expect(Errors.internal().statusCode).toBe(500);
  });
});
