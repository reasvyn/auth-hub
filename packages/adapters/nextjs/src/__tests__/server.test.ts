import { createJWT } from '@reasvyn/auth-core';

import { createAuthMiddleware } from '../middleware';
import { getServerSession, verifyAccessToken, withAuth } from '../server';

import { NextRequest } from './__mocks__/next-server';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SECRET = 'next-test-secret-long-enough';

const basePayload = {
  sub: 'user_42',
  email: 'next@example.com',
  role: 'user' as const,
  type: 'access' as const,
};

function makeToken(role: 'user' | 'admin' | 'super_admin' = 'user'): string {
  return createJWT({ ...basePayload, role }, SECRET, { expiresIn: '1h' });
}

// ─── getServerSession ─────────────────────────────────────────────────────────

describe('getServerSession()', () => {
  it('returns null when required headers are missing', async () => {
    const headers = new Headers();
    const session = getServerSession(headers);
    expect(session).toBeNull();
  });

  it('returns null when only some headers are present', async () => {
    const headers = new Headers({ 'x-auth-user-id': 'u1' });
    const session = getServerSession(headers);
    expect(session).toBeNull();
  });

  it('parses all headers into a session object', async () => {
    const headers = new Headers({
      'x-auth-user-id': 'u1',
      'x-auth-user-email': 'user@example.com',
      'x-auth-user-role': 'admin',
    });
    const session = getServerSession(headers);

    expect(session).not.toBeNull();
    expect(session!.userId).toBe('u1');
    expect(session!.email).toBe('user@example.com');
    expect(session!.role).toBe('admin');
  });

  it('sets raw payload fields', async () => {
    const headers = new Headers({
      'x-auth-user-id': 'u2',
      'x-auth-user-email': 'a@b.com',
      'x-auth-user-role': 'user',
    });
    const session = getServerSession(headers);
    expect(session!.raw.sub).toBe('u2');
    expect(session!.raw.email).toBe('a@b.com');
  });
});

// ─── verifyAccessToken ────────────────────────────────────────────────────────

describe('verifyAccessToken()', () => {
  it('returns payload for a valid token', () => {
    const token = makeToken();
    const result = verifyAccessToken(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('user_42');
    expect(result!.email).toBe('next@example.com');
  });

  it('returns null for an invalid token', () => {
    const result = verifyAccessToken('not.a.token', SECRET);
    expect(result).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = createJWT(basePayload, 'other-secret', { expiresIn: '1h' });
    const result = verifyAccessToken(token, SECRET);
    expect(result).toBeNull();
  });
});

// ─── withAuth ─────────────────────────────────────────────────────────────────

describe('withAuth()', () => {
  const handler = withAuth({ secret: SECRET }, async (_req, { session }) => {
    return Response.json({ userId: session.userId, role: session.role });
  });

  it('calls the handler and returns its response for a valid Bearer token', async () => {
    const token = makeToken('admin');
    const req = new Request('https://example.com/api/me', {
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userId).toBe('user_42');
    expect(body.role).toBe('admin');
  });

  it('returns 401 when no token is provided', async () => {
    const req = new Request('https://example.com/api/me');
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    const req = new Request('https://example.com/api/me', {
      headers: { authorization: 'Bearer invalid.jwt.here' },
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('reads token from cookie header', async () => {
    const token = makeToken();
    const cookieHandler = withAuth({ secret: SECRET, cookieName: 'access_token' }, async (_req, { session }) =>
      Response.json({ ok: true, userId: session.userId }),
    );
    const req = new Request('https://example.com/api/me', {
      headers: { cookie: `access_token=${token}` },
    });

    const res = await cookieHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userId).toBe('user_42');
  });
});

// ─── createAuthMiddleware ─────────────────────────────────────────────────────

describe('createAuthMiddleware()', () => {
  const middleware = createAuthMiddleware({ secret: SECRET, loginPath: '/login' });

  function makeEdgeRequest(
    path: string,
    opts: { token?: string; cookieToken?: string } = {},
  ): NextRequest {
    const url = `https://example.com${path}`;
    const headers: Record<string, string> = {};
    const cookies: Record<string, string> = {};

    if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
    if (opts.cookieToken) cookies['access_token'] = opts.cookieToken;

    return new NextRequest(url, { headers, cookies } as RequestInit & { cookies?: Record<string, string> });
  }

  it('allows request through when a valid Bearer token is present', async () => {
    const token = makeToken();
    const req = makeEdgeRequest('/dashboard', { token });
    const res = await middleware(req as Parameters<typeof middleware>[0]);
    // Should not redirect or 401 — middleware returns next() or forwarded request
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(302);
  });

  it('allows request through when a valid cookie token is present', async () => {
    const token = makeToken();
    const req = makeEdgeRequest('/dashboard', { cookieToken: token });
    const res = await middleware(req as Parameters<typeof middleware>[0]);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(302);
  });

  it('returns 401 JSON for /api/ routes without token', async () => {
    const req = makeEdgeRequest('/api/protected/data');
    const res = await middleware(req as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('redirects non-API routes to login when no token', async () => {
    const req = makeEdgeRequest('/dashboard');
    const res = await middleware(req as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects when token is invalid', async () => {
    const req = makeEdgeRequest('/dashboard', { token: 'bad.token.here' });
    const res = await middleware(req as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(302);
  });
});
