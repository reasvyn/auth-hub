import { createJWT } from '@reasvyn/auth-core';
import type { Request, Response, NextFunction } from 'express';

import { requireAuth, optionalAuth, requireRole } from '../middleware';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SECRET = 'test-secret-long-enough-for-hmac';

const payload = {
  sub: 'user_1',
  email: 'test@example.com',
  role: 'user' as const,
  type: 'access' as const,
};

function makeToken(overrideRole?: 'user' | 'admin' | 'super_admin') {
  return createJWT({ ...payload, ...(overrideRole ? { role: overrideRole } : {}) }, SECRET, {
    expiresIn: '1h',
  });
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _body: unknown } {
  const res: { _status: number; _body: unknown; status(code: number): typeof res; json(body: unknown): typeof res } = {
    _status: 200,
    _body: null as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res as unknown as Response & { _status: number; _body: unknown };
}

function mockNext(): NextFunction & { called: boolean } {
  const fn = () => { fn.called = true; };
  fn.called = false;
  return fn as unknown as NextFunction & { called: boolean };
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth()', () => {
  const mw = requireAuth({ secret: SECRET });

  it('calls next() when a valid Bearer token is present', () => {
    const token = makeToken();
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(true);
    expect((req as Request & { auth: unknown }).auth).toBeDefined();
  });

  it('attaches parsed payload to req.auth', () => {
    const token = makeToken();
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    const auth = (req as Request & { auth: { sub: string; email: string } }).auth;
    expect(auth.sub).toBe(payload.sub);
    expect(auth.email).toBe(payload.email);
  });

  it('returns 401 when no Authorization header is present', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it('returns 401 for invalid token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it('returns 401 for wrong secret', () => {
    const token = createJWT(payload, 'other-secret', { expiresIn: '1h' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it('calls custom onUnauthorized handler when provided', () => {
    const onUnauthorized = jest.fn();
    const customMw = requireAuth({ secret: SECRET, onUnauthorized });
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    customMw(req, res, next);

    expect(onUnauthorized).toHaveBeenCalledWith(req, res, expect.any(String));
    expect(next.called).toBe(false);
  });

  it('reads token from cookie when tokenSource is "cookie"', () => {
    const token = makeToken();
    const cookieMw = requireAuth({ secret: SECRET, tokenSource: 'cookie', cookieName: 'my_token' });
    const req = mockReq({ cookies: { my_token: token } } as Partial<Request>);
    const res = mockRes();
    const next = mockNext();

    cookieMw(req, res, next);

    expect(next.called).toBe(true);
  });
});

// ─── optionalAuth ────────────────────────────────────────────────────────────

describe('optionalAuth()', () => {
  const mw = optionalAuth({ secret: SECRET });

  it('calls next() even with no token', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(true);
    expect((req as Request & { auth?: unknown }).auth).toBeUndefined();
  });

  it('attaches payload when a valid token is present', () => {
    const token = makeToken();
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(true);
    expect((req as Request & { auth?: { sub: string } }).auth?.sub).toBe(payload.sub);
  });

  it('calls next() and leaves auth undefined when token is invalid', () => {
    const req = mockReq({ headers: { authorization: 'Bearer bad.token.here' } });
    const res = mockRes();
    const next = mockNext();

    mw(req, res, next);

    expect(next.called).toBe(true);
    expect((req as Request & { auth?: unknown }).auth).toBeUndefined();
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole()', () => {
  function makeAuthedReq(role: 'user' | 'admin' | 'super_admin') {
    const token = makeToken(role);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();
    // Simulate requireAuth running first
    requireAuth({ secret: SECRET })(req, res, next);
    next.called = false; // reset for next check
    return { req, res, next };
  }

  it('calls next() when role matches', () => {
    const { req, res, next } = makeAuthedReq('admin');
    const roleMw = requireRole('admin', 'super_admin');

    roleMw(req, res, next);

    expect(next.called).toBe(true);
  });

  it('returns 403 when role does not match', () => {
    const { req, res, next } = makeAuthedReq('user');
    const roleMw = requireRole('admin');

    roleMw(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(403);
  });

  it('returns 401 when req.auth is not set', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    const roleMw = requireRole('admin');

    roleMw(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it('allows super_admin when any role in the list matches', () => {
    const { req, res, next } = makeAuthedReq('super_admin');
    const roleMw = requireRole('admin', 'super_admin');

    roleMw(req, res, next);

    expect(next.called).toBe(true);
  });
});
