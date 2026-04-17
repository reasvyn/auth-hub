import {
  Errors,
  createTokenPair,
  generateEmailVerificationToken,
  generateMagicLinkToken,
  hashPassword,
  isAuthHubError,
  loginSchema,
  registerSchema,
  safeValidate,
  verifyEmailVerificationToken,
  verifyMagicLinkToken,
  verifyJWT,
  verifyPassword,
} from '@reasvyn/auth-core';
import type { User } from '@reasvyn/auth-types';
import { Router } from 'express';
import type { Request, Response } from 'express';

export interface AuthRouterServices {
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
  if (isAuthHubError(error)) {
    res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  res.status(fallbackStatus).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

function runRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req, res) => {
    void handler(req, res);
  };
}

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;

export function createAuthRouter(config: AuthRouterConfig) {
  const router: Router = Router();

  const { services, jwtAccessSecret, jwtRefreshSecret, hmacSecret, appBaseUrl = '' } = config;

  // POST /auth/register
  router.post('/register', runRoute(async (req: Request, res: Response) => {
    const result = safeValidate(registerSchema, req.body as unknown);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.errors } });
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
        await services.sendEmailVerification(user, token, url).catch(() => { /* non-fatal */ });
      }

      sendSuccess(res, {
        user,
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      }, 201);
    } catch (err) {
      sendError(res, err);
    }
  }));

  // POST /auth/login
  router.post('/login', runRoute(async (req: Request, res: Response) => {
    const result = safeValidate(loginSchema, req.body as unknown);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.errors } });
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
        user,
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      });
    } catch (err) {
      sendError(res, err, 401);
    }
  }));

  // POST /auth/logout
  router.post('/logout', runRoute(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      await services.revokeRefreshToken(refreshToken).catch(() => { /* best-effort */ });
    }
    sendSuccess(res, { message: 'Logged out' });
  }));

  // POST /auth/refresh
  router.post('/refresh', runRoute(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Refresh token required' } });
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
        user,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      });
    } catch (err) {
      sendError(res, err, 401);
    }
  }));

  // POST /auth/email/send-verification
  router.post('/email/send-verification', runRoute(async (req: Request, res: Response) => {
    const { userId, email } = req.body as { userId?: string; email?: string };
    if (!userId || !email) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'userId and email required' } });
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
  }));

  // POST /auth/email/verify
  router.post('/email/verify', runRoute(async (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token required' } });
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
  }));

  // POST /auth/magic-link
  router.post('/magic-link', runRoute(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email required' } });
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
  }));

  // POST /auth/magic-link/verify
  router.post('/magic-link/verify', runRoute(async (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token required' } });
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

      sendSuccess(res, { user, accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS });
    } catch (err) {
      sendError(res, err, 401);
    }
  }));

  // POST /auth/password/reset
  router.post('/password/reset', runRoute(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email required' } });
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
  }));

  // POST /auth/password/reset/confirm
  router.post('/password/reset/confirm', runRoute(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token and new password required' } });
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
  }));

  return router;
}
