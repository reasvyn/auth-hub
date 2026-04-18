import { createJWT, verifyJWT, decodeJWT, createTokenPair, isJWTExpired } from '../auth/jwt';

const SECRET = 'test-secret-key-that-is-long-enough';
const REFRESH_SECRET = 'test-refresh-secret-key-longer';

const payload = {
  sub: 'user_123',
  email: 'test@example.com',
  role: 'user' as const,
};

describe('createJWT / verifyJWT', () => {
  it('creates a non-empty token string', () => {
    const token = createJWT(payload, SECRET);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('verifyJWT decodes the payload correctly', () => {
    const token = createJWT(payload, SECRET);
    const decoded = verifyJWT(token, SECRET);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('verifyJWT throws for invalid secret', () => {
    const token = createJWT(payload, SECRET);
    expect(() => verifyJWT(token, 'wrong-secret')).toThrow();
  });

  it('verifyJWT throws for expired token', async () => {
    const token = createJWT(payload, SECRET, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 10));
    expect(() => verifyJWT(token, SECRET)).toThrow();
  });

  it('verifyJWT throws for malformed token', () => {
    expect(() => verifyJWT('not.a.jwt', SECRET)).toThrow();
  });

  it('includes custom issuer and audience when provided', () => {
    const token = createJWT(payload, SECRET, { issuer: 'my-app', audience: 'client' });
    const decoded = verifyJWT(token, SECRET, { issuer: 'my-app', audience: 'client' });
    expect(decoded.sub).toBe(payload.sub);
  });
});

describe('decodeJWT', () => {
  it('decodes without verification', () => {
    const token = createJWT(payload, SECRET);
    const decoded = decodeJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe(payload.sub);
  });

  it('returns null for garbage input', () => {
    expect(decodeJWT('garbage')).toBeNull();
  });
});

describe('createTokenPair', () => {
  it('returns accessToken and refreshToken', () => {
    const pair = createTokenPair(payload, SECRET, REFRESH_SECRET);
    expect(typeof pair.accessToken).toBe('string');
    expect(typeof pair.refreshToken).toBe('string');
    expect(pair.tokenType).toBe('Bearer');
  });

  it('access and refresh tokens are distinct', () => {
    const pair = createTokenPair(payload, SECRET, REFRESH_SECRET);
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });

  it('accessTokenExpiresAt is in the future', () => {
    const pair = createTokenPair(payload, SECRET, REFRESH_SECRET);
    expect(pair.accessTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('refreshTokenExpiresAt > accessTokenExpiresAt', () => {
    const pair = createTokenPair(payload, SECRET, REFRESH_SECRET);
    expect(pair.refreshTokenExpiresAt.getTime()).toBeGreaterThan(
      pair.accessTokenExpiresAt.getTime(),
    );
  });

  it('refresh token is verifiable with refresh secret', () => {
    const pair = createTokenPair(payload, SECRET, REFRESH_SECRET);
    const decoded = verifyJWT(pair.refreshToken, REFRESH_SECRET);
    expect(decoded.sub).toBe(payload.sub);
  });
});

describe('isJWTExpired', () => {
  it('returns false for a fresh token', () => {
    const token = createJWT(payload, SECRET, { expiresIn: '15m' });
    expect(isJWTExpired(token)).toBe(false);
  });

  it('returns true for an expired token', async () => {
    const token = createJWT(payload, SECRET, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 20));
    expect(isJWTExpired(token)).toBe(true);
  });

  it('returns false for garbage input (decode returns null — cannot determine expiry)', () => {
    expect(isJWTExpired('not-a-token')).toBe(false);
  });
});
