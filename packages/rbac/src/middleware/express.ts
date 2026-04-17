import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { RBACEngine } from '../engine';
import type { Permission } from '../types';

export interface RBACMiddlewareOptions {
  /** Initialized RBACEngine instance */
  rbac: RBACEngine;
  /**
   * Extract the role from `req`. Default: reads from `req.auth.role`
   * (compatible with @reasvyn/auth-express).
   */
  getRole?: (req: Request) => string | undefined;
  /** Custom 403 handler */
  onForbidden?: (req: Request, res: Response, permission: Permission) => void;
}

function defaultGetRole(req: Request): string | undefined {
  // Compatible with @reasvyn/auth-express req.auth
  return (req as Request & { auth?: { role?: string } }).auth?.role;
}

/**
 * Express middleware that requires a specific permission.
 * Must be placed AFTER requireAuth from @reasvyn/auth-express.
 *
 * @example
 * import { requireAuth } from '@reasvyn/auth-express';
 * import { requirePermission } from '@reasvyn/auth-rbac/middleware';
 *
 * const auth = requireAuth({ secret: process.env.JWT_SECRET! });
 *
 * app.delete(
 *   '/api/posts/:id',
 *   auth,
 *   requirePermission({ rbac, permission: 'posts:delete' }),
 *   handler,
 * );
 */
export function requirePermission(
  options: RBACMiddlewareOptions & { permission: Permission },
): RequestHandler {
  const { rbac, permission, getRole = defaultGetRole, onForbidden } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRole(req);

    if (!role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!rbac.can(role).do(permission)) {
      if (onForbidden) {
        onForbidden(req, res, permission);
        return;
      }
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied: ${permission}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware that requires ANY of the listed permissions.
 */
export function requireAnyPermission(
  options: RBACMiddlewareOptions & { permissions: Permission[] },
): RequestHandler {
  const { rbac, permissions, getRole = defaultGetRole, onForbidden } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRole(req);
    if (!role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!rbac.can(role).doAny(permissions)) {
      if (onForbidden) {
        onForbidden(req, res, permissions.join(' | '));
        return;
      }
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required one of: ${permissions.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware that requires ALL of the listed permissions.
 */
export function requireAllPermissions(
  options: RBACMiddlewareOptions & { permissions: Permission[] },
): RequestHandler {
  const { rbac, permissions, getRole = defaultGetRole, onForbidden } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRole(req);
    if (!role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!rbac.can(role).doAll(permissions)) {
      if (onForbidden) {
        onForbidden(req, res, permissions.join(' & '));
        return;
      }
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required all of: ${permissions.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
