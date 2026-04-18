/**
 * Next.js edge-compatible middleware helper.
 *
 * Usage in middleware.ts at project root:
 *
 * ```ts
 * import { createAuthMiddleware } from '@reasvyn/auth-nextjs/middleware';
 * export const middleware = createAuthMiddleware({ secret: process.env.JWT_SECRET! });
 * export const config = { matcher: ['/dashboard/:path*', '/api/protected/:path*'] };
 * ```
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export interface NextAuthMiddlewareOptions {
  /** JWT access token secret */
  secret: string;
  /** Routes that require authentication. Supports glob-like prefixes. */
  protectedRoutes?: string[];
  /** Redirect unauthenticated users here. Default: '/login' */
  loginPath?: string;
  /** Cookie name for the access token. Default: 'access_token' */
  cookieName?: string;
}

// Minimal JWT verification for Edge runtime (no Node.js crypto module)
async function verifyEdgeJWT(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;
    const exp = payload['exp'] as number | undefined;
    if (exp && Date.now() / 1000 > exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createAuthMiddleware(options: NextAuthMiddlewareOptions) {
  const { secret, loginPath = '/login', cookieName = 'access_token' } = options;

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    // Try to get token from cookie or Authorization header
    const cookieToken = request.cookies.get(cookieName)?.value;
    const headerToken = request.headers.get('authorization')?.replace(/^Bearer /, '');
    const token = cookieToken ?? headerToken;

    if (!token) {
      // For API routes, return 401 JSON; for pages, redirect
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 },
        );
      }
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyEdgeJWT(token, secret);

    if (!payload) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
          { status: 401 },
        );
      }
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Forward user info via request header for server components / route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-auth-user-id', String(payload['sub'] ?? ''));
    requestHeaders.set('x-auth-user-email', String(payload['email'] ?? ''));
    requestHeaders.set('x-auth-user-role', String(payload['role'] ?? ''));

    return NextResponse.next({ request: { headers: requestHeaders } });
  };
}
