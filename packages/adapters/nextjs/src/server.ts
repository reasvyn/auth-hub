/**
 * Server-side helpers for Next.js App Router.
 * Use inside Server Components, Route Handlers, and Server Actions.
 */
import { verifyJWT } from '@reasvyn/auth-core';
import type { JWTPayload } from '@reasvyn/auth-types';

export interface AuthSession {
  userId: string;
  email: string;
  role: JWTPayload['role'];
  raw: JWTPayload;
}

export interface GetServerSessionOptions {
  secret: string;
  cookieName?: string;
}

/**
 * Get the auth session from request headers (forwarded by createAuthMiddleware).
 * Safe to call in Server Components — reads from `x-auth-*` headers.
 */
export function getServerSession(
  headers: Headers,
  _options?: GetServerSessionOptions,
): AuthSession | null {
  const userId = headers.get('x-auth-user-id');
  const email = headers.get('x-auth-user-email');
  const role = headers.get('x-auth-user-role');

  if (!userId || !email || !role) return null;

  return {
    userId,
    email,
    role,
    raw: { sub: userId, email, role },
  };
}

/**
 * Verify a JWT access token server-side (Node.js runtime).
 */
export function verifyAccessToken(token: string, secret: string): JWTPayload | null {
  try {
    return verifyJWT(token, secret);
  } catch {
    return null;
  }
}

/**
 * Next.js App Router Route Handler helper — wraps a handler with auth check.
 *
 * ```ts
 * // app/api/me/route.ts
 * import { withAuth } from '@reasvyn/auth-nextjs';
 * export const GET = withAuth({ secret: process.env.JWT_SECRET! }, async (req, { session }) => {
 *   return Response.json({ userId: session.userId });
 * });
 * ```
 */
export interface WithAuthOptions {
  secret: string;
  cookieName?: string;
}

type AuthHandler = (
  req: Request,
  ctx: { session: AuthSession },
) => Promise<Response> | Response;

export function withAuth(options: WithAuthOptions, handler: AuthHandler) {
  return async (req: Request): Promise<Response> => {
    const { secret, cookieName = 'access_token' } = options;

    // Try Authorization header first, then cookie
    const authHeader = req.headers.get('authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      const cookieHeader = req.headers.get('cookie') ?? '';
      const match = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`).exec(cookieHeader);
      token = match?.[1] ?? null;
    }

    if (!token) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const payload = verifyAccessToken(token, secret);
    if (!payload) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        { status: 401 },
      );
    }

    const session: AuthSession = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      raw: payload,
    };

    return handler(req, { session });
  };
}
