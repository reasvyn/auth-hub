import { isAuthError, verifyJWT } from '@reasvyn/auth-core';
import type { JWTPayload } from '@reasvyn/auth-types';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface AuthMiddlewareOptions {
  /** JWT access token secret */
  secret: string;
  /** Where to read the token from. Default: 'header' */
  tokenSource?: 'header' | 'cookie';
  /** Cookie name when tokenSource is 'cookie'. Default: 'access_token' */
  cookieName?: string;
  /** Custom handler for unauthorized requests */
  onUnauthorized?: (req: Request, res: Response, error: string) => void;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: JWTPayload & { token: string };
  }
}

function extractToken(req: Request, options: AuthMiddlewareOptions): string | null {
  if (options.tokenSource === 'cookie') {
    return (req.cookies as Record<string, string>)[options.cookieName ?? 'access_token'] ?? null;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Middleware that requires a valid JWT. Returns 401 if missing/invalid.
 */
export function requireAuth(options: AuthMiddlewareOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractToken(req, options);

    if (!token) {
      if (options.onUnauthorized) {
        options.onUnauthorized(req, res, 'No token provided');
        return;
      }
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      const payload = verifyJWT(token, options.secret);
      req.auth = { ...payload, token };
      next();
    } catch (err) {
      const message = isAuthError(err) ? err.message : 'Invalid or expired token';
      if (options.onUnauthorized) {
        options.onUnauthorized(req, res, message);
        return;
      }
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message } });
    }
  };
}

/**
 * Middleware that optionally attaches auth payload if a token is present, but
 * does NOT block unauthenticated requests.
 */
export function optionalAuth(options: AuthMiddlewareOptions): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req, options);
    if (token) {
      try {
        const payload = verifyJWT(token, options.secret);
        req.auth = { ...payload, token };
      } catch {
        // Ignore invalid tokens — just don't attach auth
      }
    }
    next();
  };
}

/**
 * Role-based authorization middleware. Must be used after requireAuth.
 */
export function requireRole(...roles: JWTPayload['role'][]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res
        .status(401)
        .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }
    next();
  };
}
