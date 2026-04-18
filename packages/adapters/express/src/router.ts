import { randomUUID } from 'node:crypto';

import {
  Errors,
  createOneTimeCodeChallenge,
  createRecoveryCodeRecords,
  createTokenPair,
  createUserSecurityOverview,
  generateRecoveryCodes,
  generateEmailVerificationToken,
  generateMagicLinkToken,
  generateOneTimeCode,
  hashRecoveryCodes,
  hashPassword,
  hashOneTimeCode,
  isAuthError,
  loginSchema,
  configureSecurityMethodSchema,
  disableSecurityMethodSchema,
  redactDestination,
  regenerateRecoveryCodesSchema,
  requestOneTimeCodeSchema,
  registerSchema,
  safeValidate,
  verifyRecoveryCode,
  verifySecurityMethodSchema,
  verifyOneTimeCodeHash,
  verifyOneTimeCodeSchema,
  zodToValidationErrors,
  verifyEmailVerificationToken,
  verifyMagicLinkToken,
  verifyJWT,
  verifyPassword,
} from '@reasvyn/auth-core';
import type {
  OneTimeCodeChallenge,
  PasswordCredential,
  RegenerateRecoveryCodesResponse,
  SecurityMethodType,
  SecurityEvent,
  StoredRecoveryCode,
  StoredOneTimeCodeChallenge,
  User,
  UserSecurityMethod,
  UserSecurityOverview,
} from '@reasvyn/auth-types';
import { Router } from 'express';
import type { Request, Response } from 'express';

import { requireAuth } from './middleware';

export interface AuthRouterServices {
  /**
   * Find a user by id. Return null if not found.
   */
  findUserById(userId: string): Promise<User | null>;

  /**
   * Find a user by email. Return null if not found.
   */
  findUserByEmail(email: string): Promise<User | null>;

  /**
   * Create a new user and return it.
   */
  createUser(data: { email: string; name?: string; passwordHash: string }): Promise<User>;

  /**
   * Update user fields (e.g. emailVerifiedAt, passwordHash).
   */
  updateUser(userId: string, data: Partial<User & { passwordHash: string }>): Promise<User>;

  /**
   * Store a refresh token in persistent storage.
   */
  storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;

  /**
   * Validate a stored refresh token. Return userId or null if invalid/revoked.
   */
  validateRefreshToken(token: string): Promise<string | null>;

  /**
   * Revoke a refresh token.
   */
  revokeRefreshToken(token: string): Promise<void>;

  /**
   * Store a one-time-code challenge in persistent storage.
   */
  storeOneTimeCodeChallenge(challenge: StoredOneTimeCodeChallenge): Promise<void>;

  /**
   * Find a stored one-time-code challenge by id.
   */
  findOneTimeCodeChallenge(challengeId: string): Promise<StoredOneTimeCodeChallenge | null>;

  /**
   * Update the mutable state of a stored one-time-code challenge.
   */
  updateOneTimeCodeChallenge(
    challengeId: string,
    data: Partial<StoredOneTimeCodeChallenge>,
  ): Promise<StoredOneTimeCodeChallenge>;

  /**
   * Record a security event in persistent storage.
   */
  createSecurityEvent(event: SecurityEvent): Promise<void>;

  /**
   * List security events for a user.
   */
  listSecurityEvents(
    userId: string,
    params?: { limit?: number; cursor?: string; types?: string[] },
  ): Promise<{ items: SecurityEvent[]; nextCursor?: string }>;

  /**
   * Deliver the generated one-time code to the destination.
   */
  sendOneTimeCode(data: OneTimeCodeDelivery): Promise<void>;

  /**
   * Find the stored password credential for a user.
   */
  findPasswordCredential(userId: string): Promise<PasswordCredential | null>;

  /**
   * List stored security methods for a user.
   */
  listUserSecurityMethods(userId: string): Promise<UserSecurityMethod[]>;

  /**
   * Find a stored security method by id.
   */
  findUserSecurityMethodById(userId: string, methodId: string): Promise<UserSecurityMethod | null>;

  /**
   * Create a security method record.
   */
  createUserSecurityMethod(method: UserSecurityMethod): Promise<UserSecurityMethod>;

  /**
   * Update a stored security method.
   */
  updateUserSecurityMethod(
    methodId: string,
    data: Partial<UserSecurityMethod>,
  ): Promise<UserSecurityMethod>;

  /**
   * List stored recovery codes for a user.
   */
  listRecoveryCodes(userId: string): Promise<StoredRecoveryCode[]>;

  /**
   * Replace the full recovery code set for a user.
   */
  replaceRecoveryCodes(userId: string, codes: StoredRecoveryCode[]): Promise<void>;

  /**
   * Update an individual recovery code record.
   */
  updateRecoveryCode(
    recoveryCodeId: string,
    data: Partial<StoredRecoveryCode>,
  ): Promise<StoredRecoveryCode>;

  /**
   * Send email verification to user (you implement the delivery).
   */
  sendEmailVerification?(user: User, token: string, url: string): Promise<void>;

  /**
   * Send magic link email.
   */
  sendMagicLink?(email: string, token: string, url: string): Promise<void>;

  /**
   * Send password reset email.
   */
  sendPasswordResetEmail?(user: User, token: string, url: string): Promise<void>;
}

export interface OneTimeCodeDelivery {
  user: User;
  code: string;
  destination: string;
  challenge: OneTimeCodeChallenge;
}

type ChallengeVerificationReason = 'already_used' | 'expired' | 'invalid_code';

export interface AuthRouterConfig {
  services: AuthRouterServices;
  /** JWT access secret */
  jwtAccessSecret: string;
  /** JWT refresh secret */
  jwtRefreshSecret: string;
  /** HMAC secret for magic links / email verification */
  hmacSecret: string;
  /** Base URL for generating links in emails. Example: 'https://myapp.com' */
  appBaseUrl?: string;
}

function sendSuccess<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

function sendError(res: Response, error: unknown, fallbackStatus = 500) {
  if (isAuthError(error)) {
    res
      .status(error.statusCode)
      .json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  res.status(fallbackStatus).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

function runRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req, res) => {
    void handler(req, res);
  };
}

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;

function sanitizeUserForResponse(user: User): User {
  const safeUser = { ...(user as User & { passwordHash?: string }) };
  delete safeUser.passwordHash;
  return safeUser;
}

function getRequestMetadata(req: Request): Pick<SecurityEvent, 'ipAddress' | 'userAgent'> {
  return {
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(typeof req.headers['user-agent'] === 'string'
      ? { userAgent: req.headers['user-agent'] }
      : {}),
  };
}

function toPublicOneTimeCodeChallenge(challenge: StoredOneTimeCodeChallenge): OneTimeCodeChallenge {
  return {
    id: challenge.id,
    purpose: challenge.purpose,
    method: challenge.method,
    userId: challenge.userId,
    destination: redactDestination(challenge.destination),
    expiresAt: challenge.expiresAt,
    attemptsRemaining: challenge.attemptsRemaining,
    ...(challenge.verifiedAt ? { verifiedAt: challenge.verifiedAt } : {}),
    ...(challenge.consumedAt ? { consumedAt: challenge.consumedAt } : {}),
    createdAt: challenge.createdAt,
    ...(challenge.metadata ? { metadata: challenge.metadata } : {}),
  };
}

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getMethodChallengeChannel(type: SecurityMethodType): 'email' | 'sms' | null {
  if (type === 'email_otp') {
    return 'email';
  }

  if (type === 'sms_otp') {
    return 'sms';
  }

  return null;
}

async function createAndDispatchOneTimeCodeChallenge(
  services: AuthRouterServices,
  hmacSecret: string,
  req: Request,
  input: {
    user: User;
    purpose: OneTimeCodeChallenge['purpose'];
    method: OneTimeCodeChallenge['method'];
    destination: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ publicChallenge: OneTimeCodeChallenge; storedChallenge: StoredOneTimeCodeChallenge }> {
  const code = generateOneTimeCode();
  const publicChallenge = createOneTimeCodeChallenge({
    purpose: input.purpose,
    method: input.method,
    userId: input.user.id,
    destination: input.destination,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });

  const storedChallenge: StoredOneTimeCodeChallenge = {
    ...publicChallenge,
    userId: input.user.id,
    destination: input.destination,
    codeHash: hashOneTimeCode(code, { secret: hmacSecret }),
  };

  await services.storeOneTimeCodeChallenge(storedChallenge);

  try {
    await services.sendOneTimeCode({
      user: input.user,
      code,
      destination: input.destination,
      challenge: publicChallenge,
    });
  } catch (error) {
    await services.updateOneTimeCodeChallenge(storedChallenge.id, {
      consumedAt: new Date(),
    });
    throw error;
  }

  await services.createSecurityEvent({
    type: 'otp_challenge_requested',
    userId: input.user.id,
    timestamp: new Date(),
    metadata: {
      challengeId: storedChallenge.id,
      purpose: storedChallenge.purpose,
      method: storedChallenge.method,
      ...(input.metadata ? { context: input.metadata } : {}),
    },
    ...getRequestMetadata(req),
  });

  return { publicChallenge, storedChallenge };
}

async function verifyStoredOneTimeCodeChallenge(
  services: AuthRouterServices,
  hmacSecret: string,
  req: Request,
  challenge: StoredOneTimeCodeChallenge,
  code: string,
): Promise<{
  verified: boolean;
  challenge: StoredOneTimeCodeChallenge;
  reason?: ChallengeVerificationReason;
}> {
  const eventMetadata = {
    challengeId: challenge.id,
    purpose: challenge.purpose,
    method: challenge.method,
  };

  if (challenge.consumedAt) {
    await services.createSecurityEvent({
      type: 'otp_challenge_failed',
      userId: challenge.userId,
      timestamp: new Date(),
      metadata: { ...eventMetadata, reason: 'already_used' },
      ...getRequestMetadata(req),
    });

    return {
      verified: false,
      challenge,
      reason: 'already_used',
    };
  }

  const now = new Date();
  if (challenge.expiresAt.getTime() <= now.getTime()) {
    const expiredChallenge = await services.updateOneTimeCodeChallenge(challenge.id, {
      consumedAt: now,
    });

    await services.createSecurityEvent({
      type: 'otp_challenge_expired',
      userId: challenge.userId,
      timestamp: now,
      metadata: eventMetadata,
      ...getRequestMetadata(req),
    });

    return {
      verified: false,
      challenge: expiredChallenge,
      reason: 'expired',
    };
  }

  const verified = verifyOneTimeCodeHash(code, challenge.codeHash, {
    secret: hmacSecret,
  });

  if (!verified) {
    const nextAttemptsRemaining = Math.max(0, challenge.attemptsRemaining - 1);
    const failedChallenge = await services.updateOneTimeCodeChallenge(challenge.id, {
      attemptsRemaining: nextAttemptsRemaining,
      ...(nextAttemptsRemaining === 0 ? { consumedAt: now } : {}),
    });

    await services.createSecurityEvent({
      type: 'otp_challenge_failed',
      userId: challenge.userId,
      timestamp: now,
      metadata: {
        ...eventMetadata,
        reason: 'invalid_code',
        attemptsRemaining: failedChallenge.attemptsRemaining,
      },
      ...getRequestMetadata(req),
    });

    return {
      verified: false,
      challenge: failedChallenge,
      reason: 'invalid_code',
    };
  }

  const verifiedChallenge = await services.updateOneTimeCodeChallenge(challenge.id, {
    verifiedAt: now,
    consumedAt: now,
  });

  await services.createSecurityEvent({
    type: 'otp_challenge_verified',
    userId: challenge.userId,
    timestamp: now,
    metadata: eventMetadata,
    ...getRequestMetadata(req),
  });

  return {
    verified: true,
    challenge: verifiedChallenge,
  };
}

async function verifyPasswordForUser(
  services: AuthRouterServices,
  userId: string,
  password: string,
): Promise<boolean> {
  const credential = await services.findPasswordCredential(userId);
  if (!credential) {
    return false;
  }

  return verifyPassword(password, credential.passwordHash);
}

async function consumeRecoveryCodeIfValid(
  services: AuthRouterServices,
  userId: string,
  code: string,
): Promise<boolean> {
  const recoveryCodes = (await services.listRecoveryCodes(userId)).filter((entry) => !entry.usedAt);
  const result = await verifyRecoveryCode(
    code,
    recoveryCodes.map((entry) => entry.codeHash),
  );

  if (!result.valid || !result.matchedHash) {
    return false;
  }

  const matchedCode = recoveryCodes.find((entry) => entry.codeHash === result.matchedHash);
  if (!matchedCode) {
    return false;
  }

  await services.updateRecoveryCode(matchedCode.id, { usedAt: new Date() });
  return true;
}

async function ensureSinglePrimaryMethod(
  services: AuthRouterServices,
  userId: string,
  primaryMethodId: string,
): Promise<void> {
  const methods = await services.listUserSecurityMethods(userId);
  await Promise.all(
    methods
      .filter((method) => method.id !== primaryMethodId && method.isPrimary)
      .map((method) =>
        services.updateUserSecurityMethod(method.id, {
          isPrimary: false,
          updatedAt: new Date(),
        }),
      ),
  );
}

async function promoteFallbackPrimaryMethod(
  services: AuthRouterServices,
  userId: string,
  excludedMethodId: string,
): Promise<void> {
  const methods = await services.listUserSecurityMethods(userId);
  const nextPrimary = methods.find(
    (method) =>
      method.id !== excludedMethodId &&
      method.status === 'enabled' &&
      method.type !== 'recovery_code',
  );

  if (!nextPrimary || nextPrimary.isPrimary) {
    return;
  }

  await services.updateUserSecurityMethod(nextPrimary.id, {
    isPrimary: true,
    updatedAt: new Date(),
  });
}

export function createAuthRouter(config: AuthRouterConfig) {
  const router: Router = Router();

  const { services, jwtAccessSecret, jwtRefreshSecret, hmacSecret, appBaseUrl = '' } = config;

  // POST /auth/register
  router.post(
    '/auth/register',
    runRoute(async (req: Request, res: Response) => {
      const result = safeValidate(registerSchema, req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.errors },
        });
        return;
      }

      const { email, password, displayName } = result.data;

      try {
        const existing = await services.findUserByEmail(email);
        if (existing) throw Errors.emailAlreadyExists();

        const passwordHash = await hashPassword(password);
        const user = await services.createUser({
          email,
          passwordHash,
          ...(displayName ? { name: displayName } : {}),
        });

        const { accessToken, refreshToken } = createTokenPair(
          { sub: user.id, email: user.email, role: user.role },
          jwtAccessSecret,
          jwtRefreshSecret,
        );

        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await services.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

        if (services.sendEmailVerification) {
          const { token } = generateEmailVerificationToken(user.id, user.email, hmacSecret);
          const url = `${appBaseUrl}/auth/email/verify?token=${token}`;
          await services.sendEmailVerification(user, token, url).catch(() => {
            /* non-fatal */
          });
        }

        sendSuccess(
          res,
          {
            user: sanitizeUserForResponse(user),
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
          },
          201,
        );
      } catch (err) {
        sendError(res, err);
      }
    }),
  );

  // POST /auth/login
  router.post(
    '/auth/login',
    runRoute(async (req: Request, res: Response) => {
      const result = safeValidate(loginSchema, req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.errors },
        });
        return;
      }

      const { email, password } = result.data;

      try {
        const user = await services.findUserByEmail(email);
        if (!user) throw Errors.invalidCredentials();

        const passwordHash: unknown = Reflect.get(user, 'passwordHash');
        if (typeof passwordHash !== 'string') throw Errors.invalidCredentials();

        const valid = await verifyPassword(password, passwordHash);
        if (!valid) throw Errors.invalidCredentials();

        const { accessToken, refreshToken } = createTokenPair(
          { sub: user.id, email: user.email, role: user.role },
          jwtAccessSecret,
          jwtRefreshSecret,
        );

        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await services.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

        sendSuccess(res, {
          user: sanitizeUserForResponse(user),
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        });
      } catch (err) {
        sendError(res, err, 401);
      }
    }),
  );

  // POST /auth/logout
  router.post(
    '/auth/logout',
    runRoute(async (req: Request, res: Response) => {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        await services.revokeRefreshToken(refreshToken).catch(() => {
          /* best-effort */
        });
      }
      sendSuccess(res, { message: 'Logged out' });
    }),
  );

  // POST /auth/refresh
  router.post(
    '/auth/refresh',
    runRoute(async (req: Request, res: Response) => {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Refresh token required' },
        });
        return;
      }

      try {
        const userId = await services.validateRefreshToken(refreshToken);
        if (!userId) throw Errors.tokenExpired();

        const payload = verifyJWT(refreshToken, jwtRefreshSecret);
        const user = await services.findUserByEmail(payload.email);
        if (!user) throw Errors.invalidCredentials();

        await services.revokeRefreshToken(refreshToken);

        const { accessToken, refreshToken: newRefreshToken } = createTokenPair(
          { sub: user.id, email: user.email, role: user.role },
          jwtAccessSecret,
          jwtRefreshSecret,
        );

        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await services.storeRefreshToken(user.id, newRefreshToken, refreshExpiresAt);

        sendSuccess(res, {
          user: sanitizeUserForResponse(user),
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        });
      } catch (err) {
        sendError(res, err, 401);
      }
    }),
  );

  // POST /auth/email/send-verification
  router.post(
    '/auth/email/send-verification',
    runRoute(async (req: Request, res: Response) => {
      const { userId, email } = req.body as { userId?: string; email?: string };
      if (!userId || !email) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'userId and email required' },
        });
        return;
      }

      try {
        const { token } = generateEmailVerificationToken(userId, email, hmacSecret);
        const url = `${appBaseUrl}/auth/email/verify?token=${token}`;
        const user = await services.findUserByEmail(email);
        if (user && services.sendEmailVerification) {
          await services.sendEmailVerification(user, token, url);
        }
        sendSuccess(res, { message: 'Verification email sent' });
      } catch (err) {
        sendError(res, err);
      }
    }),
  );

  // POST /auth/email/verify
  router.post(
    '/auth/email/verify',
    runRoute(async (req: Request, res: Response) => {
      const { token } = req.body as { token?: string };
      if (!token) {
        res
          .status(400)
          .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token required' } });
        return;
      }

      try {
        const result = verifyEmailVerificationToken(token, hmacSecret);
        if (!result.valid || !result.userId) throw Errors.tokenInvalid(result.reason);
        await services.updateUser(result.userId, { emailVerified: true });
        sendSuccess(res, { message: 'Email verified successfully' });
      } catch (err) {
        sendError(res, err, 400);
      }
    }),
  );

  // POST /auth/magic-link
  router.post(
    '/auth/magic-link',
    runRoute(async (req: Request, res: Response) => {
      const { email } = req.body as { email?: string };
      if (!email) {
        res
          .status(400)
          .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email required' } });
        return;
      }

      try {
        // Always respond with success to prevent email enumeration
        const user = await services.findUserByEmail(email);
        if (user && services.sendMagicLink) {
          const { token } = generateMagicLinkToken(email, { secret: hmacSecret });
          const url = `${appBaseUrl}/auth/magic-link/verify?token=${token}`;
          await services.sendMagicLink(email, token, url);
        }
        sendSuccess(res, { message: 'Magic link sent if email exists' });
      } catch (err) {
        sendError(res, err);
      }
    }),
  );

  // POST /auth/magic-link/verify
  router.post(
    '/auth/magic-link/verify',
    runRoute(async (req: Request, res: Response) => {
      const { token } = req.body as { token?: string };
      if (!token) {
        res
          .status(400)
          .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token required' } });
        return;
      }

      try {
        const result = verifyMagicLinkToken(token, hmacSecret);
        if (!result.valid || !result.email) throw Errors.tokenInvalid(result.reason);
        const { email } = result;
        const user = await services.findUserByEmail(email);
        if (!user) throw Errors.invalidCredentials();

        const { accessToken, refreshToken } = createTokenPair(
          { sub: user.id, email: user.email, role: user.role },
          jwtAccessSecret,
          jwtRefreshSecret,
        );

        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await services.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

        sendSuccess(res, {
          user: sanitizeUserForResponse(user),
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        });
      } catch (err) {
        sendError(res, err, 401);
      }
    }),
  );

  // POST /auth/password/reset
  router.post(
    '/auth/password/reset',
    runRoute(async (req: Request, res: Response) => {
      const { email } = req.body as { email?: string };
      if (!email) {
        res
          .status(400)
          .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email required' } });
        return;
      }

      try {
        const user = await services.findUserByEmail(email);
        if (user && services.sendPasswordResetEmail) {
          const { token } = generateMagicLinkToken(email, {
            secret: hmacSecret,
            expiresIn: 3600_000,
          });
          const url = `${appBaseUrl}/auth/password/reset/confirm?token=${token}`;
          await services.sendPasswordResetEmail(user, token, url);
        }
        // Always 200 to prevent email enumeration
        sendSuccess(res, { message: 'Reset link sent if email exists' });
      } catch (err) {
        sendError(res, err);
      }
    }),
  );

  // POST /auth/password/reset/confirm
  router.post(
    '/auth/password/reset/confirm',
    runRoute(async (req: Request, res: Response) => {
      const { token, newPassword } = req.body as { token?: string; newPassword?: string };
      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Token and new password required' },
        });
        return;
      }

      try {
        const result = verifyMagicLinkToken(token, hmacSecret);
        if (!result.valid || !result.email) throw Errors.tokenInvalid(result.reason);
        const { email } = result;
        const user = await services.findUserByEmail(email);
        if (!user) throw Errors.invalidCredentials();

        const passwordHash = await hashPassword(newPassword);
        await services.updateUser(user.id, { passwordHash });

        sendSuccess(res, { message: 'Password reset successfully' });
      } catch (err) {
        sendError(res, err, 400);
      }
    }),
  );

  router.use('/users/me/security', requireAuth({ secret: jwtAccessSecret }));

  // GET /users/me/security
  router.get(
    '/users/me/security',
    runRoute(async (req: Request, res: Response) => {
      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const user = await services.findUserById(authenticatedUserId);
      if (!user) {
        sendError(res, Errors.notFound('User'), 404);
        return;
      }

      const [passwordCredential, methods, recoveryCodes, events] = await Promise.all([
        services.findPasswordCredential(user.id),
        services.listUserSecurityMethods(user.id),
        services.listRecoveryCodes(user.id),
        services.listSecurityEvents(user.id, { limit: 1 }),
      ]);

      const overview: UserSecurityOverview = createUserSecurityOverview({
        userId: user.id,
        userStatus: user.status,
        emailVerified: user.emailVerified,
        passwordConfigured: Boolean(passwordCredential),
        ...(passwordCredential
          ? {
              passwordLastChangedAt: passwordCredential.passwordUpdatedAt,
              failedLoginAttempts: passwordCredential.failedLoginAttempts,
              ...(passwordCredential.lockedUntil
                ? { lockedUntil: passwordCredential.lockedUntil }
                : {}),
            }
          : {}),
        methods,
        recoveryCodesRemaining: recoveryCodes.filter((entry) => !entry.usedAt).length,
        ...(events.items[0] ? { lastSecurityReviewAt: events.items[0].timestamp } : {}),
      });

      sendSuccess(res, overview);
    }),
  );

  // GET /users/me/security/methods
  router.get(
    '/users/me/security/methods',
    runRoute(async (req: Request, res: Response) => {
      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const methods = await services.listUserSecurityMethods(authenticatedUserId);
      sendSuccess(res, methods);
    }),
  );

  // POST /users/me/security/methods
  router.post(
    '/users/me/security/methods',
    runRoute(async (req: Request, res: Response) => {
      const result = configureSecurityMethodSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const user = await services.findUserById(authenticatedUserId);
      if (!user) {
        sendError(res, Errors.notFound('User'), 404);
        return;
      }

      const payload = result.data;
      const challengeMethod = getMethodChallengeChannel(payload.method);

      if (payload.method === 'password' || payload.method === 'recovery_code') {
        sendError(
          res,
          Errors.forbidden('This security method is managed by a dedicated credential flow'),
          403,
        );
        return;
      }

      if (!challengeMethod) {
        sendError(
          res,
          Errors.forbidden('TOTP enrollment is not yet supported by the Express adapter'),
          403,
        );
        return;
      }

      const destination =
        payload.destination ??
        (challengeMethod === 'email' ? user.email : user.profile?.phoneNumber);

      if (!destination) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'A verified destination is required to configure this security method',
          },
        });
        return;
      }

      const existingMethods = await services.listUserSecurityMethods(user.id);
      const existingMethod = existingMethods.find(
        (method) =>
          method.type === payload.method &&
          method.redactedDestination === redactDestination(destination) &&
          method.status !== 'disabled',
      );

      if (existingMethod) {
        res.status(409).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'This security method is already configured',
          },
        });
        return;
      }

      const now = new Date();
      const securityMethod: UserSecurityMethod = {
        id: randomUUID(),
        userId: user.id,
        type: payload.method,
        status: 'pending',
        ...(payload.label ? { label: payload.label } : {}),
        isPrimary: false,
        redactedDestination: redactDestination(destination),
        createdAt: now,
        updatedAt: now,
        ...(payload.isPrimary ? { metadata: { requestedPrimary: true } } : {}),
      };

      const createdMethod = await services.createUserSecurityMethod(securityMethod);

      const { storedChallenge } = await createAndDispatchOneTimeCodeChallenge(
        services,
        hmacSecret,
        req,
        {
          user,
          purpose: 'security_method_enrollment',
          method: challengeMethod,
          destination,
          metadata: { methodId: createdMethod.id },
        },
      );

      const updatedMethod = await services.updateUserSecurityMethod(createdMethod.id, {
        metadata: {
          ...(createdMethod.metadata ?? {}),
          pendingChallengeId: storedChallenge.id,
          requestedPrimary: Boolean(payload.isPrimary),
        },
        updatedAt: new Date(),
      });

      await services.createSecurityEvent({
        type: 'security_method_configured',
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          methodId: updatedMethod.id,
          method: updatedMethod.type,
        },
        ...getRequestMetadata(req),
      });

      sendSuccess(res, updatedMethod, 201);
    }),
  );

  // POST /users/me/security/methods/:methodId/verify
  router.post(
    '/users/me/security/methods/:methodId/verify',
    runRoute(async (req: Request, res: Response) => {
      const result = verifySecurityMethodSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const securityMethod = await services.findUserSecurityMethodById(
        authenticatedUserId,
        req.params.methodId,
      );
      if (!securityMethod) {
        sendError(res, Errors.notFound('Security method'), 404);
        return;
      }

      const challengeMethod = getMethodChallengeChannel(securityMethod.type);
      if (!challengeMethod) {
        sendError(
          res,
          Errors.forbidden('This security method cannot be verified with a one-time code'),
          403,
        );
        return;
      }

      const payload = result.data;
      const challengeId =
        payload.challengeId ?? readMetadataString(securityMethod.metadata, 'pendingChallengeId');

      if (!challengeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Challenge ID is required to verify this security method',
          },
        });
        return;
      }

      const challenge = await services.findOneTimeCodeChallenge(challengeId);
      if (!challenge || challenge.userId !== authenticatedUserId) {
        sendError(res, Errors.notFound('One-time-code challenge'), 404);
        return;
      }

      if (
        challenge.purpose !== 'security_method_enrollment' ||
        challenge.method !== challengeMethod ||
        readMetadataString(challenge.metadata, 'methodId') !== securityMethod.id
      ) {
        sendError(
          res,
          Errors.forbidden('This challenge cannot verify the requested security method'),
          403,
        );
        return;
      }

      const verification = await verifyStoredOneTimeCodeChallenge(
        services,
        hmacSecret,
        req,
        challenge,
        payload.code,
      );

      if (!verification.verified) {
        const error =
          verification.reason === 'expired'
            ? Errors.tokenExpired()
            : verification.reason === 'invalid_code'
              ? Errors.mfaCodeInvalid()
              : Errors.tokenInvalid('One-time code challenge has already been used');
        sendError(res, error, 401);
        return;
      }

      const shouldBePrimary =
        readMetadataString(securityMethod.metadata, 'requestedPrimary') === 'true' ||
        Boolean(securityMethod.metadata?.requestedPrimary) ||
        !(await services.listUserSecurityMethods(authenticatedUserId)).some(
          (method) =>
            method.id !== securityMethod.id &&
            method.status === 'enabled' &&
            method.type !== 'recovery_code' &&
            method.isPrimary,
        );

      const now = new Date();
      const verifiedMethod = await services.updateUserSecurityMethod(securityMethod.id, {
        status: 'enabled',
        ...(shouldBePrimary ? { isPrimary: true } : {}),
        verifiedAt: now,
        lastUsedAt: now,
        updatedAt: now,
        metadata: {
          ...(securityMethod.metadata ?? {}),
          pendingChallengeId: undefined,
          requestedPrimary: undefined,
        },
      });

      if (verifiedMethod.isPrimary) {
        await ensureSinglePrimaryMethod(services, authenticatedUserId, verifiedMethod.id);
      }

      await services.createSecurityEvent({
        type: 'security_method_verified',
        userId: authenticatedUserId,
        timestamp: now,
        metadata: {
          methodId: verifiedMethod.id,
          method: verifiedMethod.type,
        },
        ...getRequestMetadata(req),
      });

      sendSuccess(res, verifiedMethod);
    }),
  );

  // POST /users/me/security/methods/:methodId/disable
  router.post(
    '/users/me/security/methods/:methodId/disable',
    runRoute(async (req: Request, res: Response) => {
      const result = disableSecurityMethodSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const securityMethod = await services.findUserSecurityMethodById(
        authenticatedUserId,
        req.params.methodId,
      );
      if (!securityMethod) {
        sendError(res, Errors.notFound('Security method'), 404);
        return;
      }

      const payload = result.data;
      const authorizedByPassword = payload.password
        ? await verifyPasswordForUser(services, authenticatedUserId, payload.password)
        : false;
      const authorizedByRecoveryCode = payload.verificationCode
        ? await consumeRecoveryCodeIfValid(services, authenticatedUserId, payload.verificationCode)
        : false;

      if (!authorizedByPassword && !authorizedByRecoveryCode) {
        sendError(res, Errors.invalidCredentials(), 401);
        return;
      }

      const disabledMethod = await services.updateUserSecurityMethod(securityMethod.id, {
        status: 'disabled',
        isPrimary: false,
        updatedAt: new Date(),
      });

      if (securityMethod.isPrimary) {
        await promoteFallbackPrimaryMethod(services, authenticatedUserId, securityMethod.id);
      }

      await services.createSecurityEvent({
        type: 'security_method_disabled',
        userId: authenticatedUserId,
        timestamp: new Date(),
        metadata: {
          methodId: disabledMethod.id,
          method: disabledMethod.type,
          verificationStrategy: authorizedByPassword ? 'password' : 'recovery_code',
        },
        ...getRequestMetadata(req),
      });

      sendSuccess(res, undefined);
    }),
  );

  // POST /users/me/security/recovery-codes
  router.post(
    '/users/me/security/recovery-codes',
    runRoute(async (req: Request, res: Response) => {
      const result = regenerateRecoveryCodesSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const authorized = await verifyPasswordForUser(
        services,
        authenticatedUserId,
        result.data.password,
      );
      if (!authorized) {
        sendError(res, Errors.invalidCredentials(), 401);
        return;
      }

      if (result.data.verificationCode) {
        const consumed = await consumeRecoveryCodeIfValid(
          services,
          authenticatedUserId,
          result.data.verificationCode,
        );
        if (!consumed) {
          sendError(res, Errors.mfaCodeInvalid(), 401);
          return;
        }
      }

      const generatedAt = new Date();
      const codes = generateRecoveryCodes();
      const codeHashes = await hashRecoveryCodes(codes);
      const records = createRecoveryCodeRecords(codes, generatedAt);
      const storedRecoveryCodes: StoredRecoveryCode[] = records.map((record, index) => ({
        ...record,
        userId: authenticatedUserId,
        codeHash: codeHashes[index],
      }));

      await services.replaceRecoveryCodes(authenticatedUserId, storedRecoveryCodes);

      const existingRecoveryMethod = (
        await services.listUserSecurityMethods(authenticatedUserId)
      ).find((method) => method.type === 'recovery_code');

      if (existingRecoveryMethod) {
        await services.updateUserSecurityMethod(existingRecoveryMethod.id, {
          status: 'enabled',
          updatedAt: generatedAt,
          verifiedAt: existingRecoveryMethod.verifiedAt ?? generatedAt,
        });
      } else {
        await services.createUserSecurityMethod({
          id: randomUUID(),
          userId: authenticatedUserId,
          type: 'recovery_code',
          status: 'enabled',
          label: 'Recovery codes',
          isPrimary: false,
          createdAt: generatedAt,
          updatedAt: generatedAt,
          verifiedAt: generatedAt,
        });
      }

      await services.createSecurityEvent({
        type: 'recovery_codes_regenerated',
        userId: authenticatedUserId,
        timestamp: generatedAt,
        metadata: { count: codes.length },
        ...getRequestMetadata(req),
      });

      const response: RegenerateRecoveryCodesResponse = {
        generatedAt,
        codes,
      };

      sendSuccess(res, response);
    }),
  );

  // GET /users/me/security/events
  router.get(
    '/users/me/security/events',
    runRoute(async (req: Request, res: Response) => {
      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const limit =
        typeof req.query.limit === 'string' && !Number.isNaN(Number(req.query.limit))
          ? Number(req.query.limit)
          : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const types =
        typeof req.query.types === 'string'
          ? [req.query.types]
          : Array.isArray(req.query.types)
            ? req.query.types.filter((value): value is string => typeof value === 'string')
            : undefined;

      const events = await services.listSecurityEvents(authenticatedUserId, {
        ...(limit !== undefined ? { limit } : {}),
        ...(cursor ? { cursor } : {}),
        ...(types ? { types } : {}),
      });

      sendSuccess(res, events);
    }),
  );

  // POST /users/me/security/challenges
  router.post(
    '/users/me/security/challenges',
    runRoute(async (req: Request, res: Response) => {
      const result = requestOneTimeCodeSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const user = await services.findUserById(authenticatedUserId);
      if (!user) {
        sendError(res, Errors.notFound('User'), 404);
        return;
      }

      const payload = result.data;

      if (payload.method === 'totp') {
        sendError(
          res,
          Errors.forbidden('TOTP challenges must be verified locally by an authenticator app'),
          403,
        );
        return;
      }

      const destination =
        payload.destination ??
        (payload.method === 'email' ? user.email : user.profile?.phoneNumber);

      if (!destination) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'A verified email address or phone number is required for this challenge',
          },
        });
        return;
      }

      const { publicChallenge } = await createAndDispatchOneTimeCodeChallenge(
        services,
        hmacSecret,
        req,
        {
          user,
          purpose: payload.purpose,
          method: payload.method,
          destination,
          ...(payload.context ? { metadata: payload.context } : {}),
        },
      );

      sendSuccess(res, publicChallenge, 201);
    }),
  );

  // POST /users/me/security/challenges/verify
  router.post(
    '/users/me/security/challenges/verify',
    runRoute(async (req: Request, res: Response) => {
      const result = verifyOneTimeCodeSchema.safeParse(req.body as unknown);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: zodToValidationErrors(result.error),
          },
        });
        return;
      }

      const authenticatedUserId = req.auth?.sub;
      if (!authenticatedUserId) {
        sendError(res, Errors.unauthorized('Authentication required'), 401);
        return;
      }

      const payload = result.data;
      const challenge = await services.findOneTimeCodeChallenge(payload.challengeId);

      if (!challenge || challenge.userId !== authenticatedUserId) {
        sendError(res, Errors.notFound('One-time-code challenge'), 404);
        return;
      }

      const verification = await verifyStoredOneTimeCodeChallenge(
        services,
        hmacSecret,
        req,
        challenge,
        payload.code,
      );

      sendSuccess(res, {
        verified: verification.verified,
        challenge: toPublicOneTimeCodeChallenge(verification.challenge),
      });
    }),
  );

  return router;
}
