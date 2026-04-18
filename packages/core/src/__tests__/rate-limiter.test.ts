import {
  RateLimiter,
  createLoginRateLimiter,
  createApiRateLimiter,
} from '../security/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  });

  it('allows requests under the limit', () => {
    const result = limiter.check('key1');
    expect(result.allowed).toBe(true);
    expect(result.info.remaining).toBe(2);
  });

  it('tracks remaining count correctly', () => {
    limiter.check('key1');
    limiter.check('key1');
    const result = limiter.check('key1'); // 3rd — exactly at limit
    expect(result.allowed).toBe(true);
    expect(result.info.remaining).toBe(0);
  });

  it('blocks after limit is exceeded', () => {
    limiter.check('key1');
    limiter.check('key1');
    limiter.check('key1'); // at limit
    const result = limiter.check('key1'); // over limit
    expect(result.allowed).toBe(false);
    expect(result.info.remaining).toBe(0);
    expect(result.info.retryAfter).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    limiter.check('a');
    limiter.check('a');
    limiter.check('a'); // a is at limit
    const resultA = limiter.check('a');
    const resultB = limiter.check('b'); // b is fresh
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('reset() clears the counter for a key', () => {
    limiter.check('key1');
    limiter.check('key1');
    limiter.check('key1'); // at limit
    limiter.reset('key1');
    const result = limiter.check('key1');
    expect(result.allowed).toBe(true);
    expect(result.info.remaining).toBe(2);
  });

  it('getInfo() returns current state without incrementing', () => {
    limiter.check('key1');
    const info = limiter.getInfo('key1');
    expect(info.remaining).toBe(2); // 1 used, 2 left
    // Check again — count should not have changed
    const info2 = limiter.getInfo('key1');
    expect(info2.remaining).toBe(2);
  });

  it('getInfo() returns full remaining for unknown key', () => {
    const info = limiter.getInfo('unknown');
    expect(info.remaining).toBe(3);
  });

  it('resets after the window expires', async () => {
    const shortLimiter = new RateLimiter({ maxRequests: 1, windowMs: 50 });
    shortLimiter.check('k');
    expect(shortLimiter.check('k').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(shortLimiter.check('k').allowed).toBe(true);
  });
});

describe('createLoginRateLimiter()', () => {
  it('creates a limiter with 5 max requests', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('ip').allowed).toBe(true);
    }
    expect(limiter.check('ip').allowed).toBe(false);
  });
});

describe('createApiRateLimiter()', () => {
  it('creates a limiter with 100 max requests', () => {
    const limiter = createApiRateLimiter();
    const result = limiter.check('ip');
    expect(result.info.limit).toBe(100);
  });
});
