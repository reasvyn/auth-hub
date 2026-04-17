import { BruteForceProtection } from '../security/brute-force';

describe('BruteForceProtection', () => {
  let bf: BruteForceProtection;

  beforeEach(() => {
    bf = new BruteForceProtection({ maxAttempts: 3, lockoutDurationMs: 1000 });
  });

  it('allows attempts below the threshold', () => {
    const result = bf.recordFailedAttempt('user@example.com');
    expect(result.locked).toBe(false);
    expect(result.attemptsRemaining).toBe(2);
  });

  it('locks after maxAttempts is reached', () => {
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com');
    const result = bf.recordFailedAttempt('a@b.com');
    expect(result.locked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
    expect(result.lockedUntil).toBeInstanceOf(Date);
  });

  it('isLocked returns true for a locked identifier', () => {
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com'); // locked
    const { locked } = bf.isLocked('a@b.com');
    expect(locked).toBe(true);
  });

  it('isLocked returns false for an unknown identifier', () => {
    expect(bf.isLocked('unknown@x.com').locked).toBe(false);
  });

  it('clearAttempts (via reset) resets the counter', () => {
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com'); // locked
    bf.reset('a@b.com');
    expect(bf.isLocked('a@b.com').locked).toBe(false);
    const result = bf.recordFailedAttempt('a@b.com');
    expect(result.attemptsRemaining).toBe(2);
  });

  it('unlocks automatically after lockout duration', async () => {
    const shortBf = new BruteForceProtection({ maxAttempts: 1, lockoutDurationMs: 50 });
    shortBf.recordFailedAttempt('x');
    expect(shortBf.isLocked('x').locked).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(shortBf.isLocked('x').locked).toBe(false);
  });

  it('tracks different identifiers independently', () => {
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com');
    bf.recordFailedAttempt('a@b.com');
    expect(bf.isLocked('a@b.com').locked).toBe(true);
    expect(bf.isLocked('other@b.com').locked).toBe(false);
  });
});
