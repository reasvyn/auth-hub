/**
 * Brute force protection utilities
 */

export interface BruteForceOptions {
  maxAttempts: number;
  lockoutDurationMs: number;
}

interface AttemptRecord {
  attempts: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

export class BruteForceProtection {
  private readonly store = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly lockoutDurationMs: number;

  constructor(options: BruteForceOptions) {
    this.maxAttempts = options.maxAttempts;
    this.lockoutDurationMs = options.lockoutDurationMs;
  }

  /**
   * Record a failed attempt and check if the account should be locked
   */
  recordFailedAttempt(identifier: string): { locked: boolean; attemptsRemaining: number; lockedUntil?: Date } {
    const now = Date.now();
    const record = this.store.get(identifier) ?? { attempts: 0, lastAttemptAt: now };

    // Reset if lockout expired
    if (record.lockedUntil && now > record.lockedUntil) {
      record.attempts = 0;
      delete record.lockedUntil;
    }

    record.attempts += 1;
    record.lastAttemptAt = now;

    if (record.attempts >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDurationMs;
    }

    this.store.set(identifier, record);

    const attemptsRemaining = Math.max(0, this.maxAttempts - record.attempts);
    return {
      locked: record.attempts >= this.maxAttempts,
      attemptsRemaining,
      ...(record.lockedUntil ? { lockedUntil: new Date(record.lockedUntil) } : {}),
    };
  }

  /**
   * Check if an identifier is currently locked
   */
  isLocked(identifier: string): { locked: boolean; lockedUntil?: Date } {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record?.lockedUntil) return { locked: false };
    if (now > record.lockedUntil) {
      record.attempts = 0;
      delete record.lockedUntil;
      return { locked: false };
    }

    return { locked: true, lockedUntil: new Date(record.lockedUntil) };
  }

  /**
   * Reset the attempt counter (e.g., after successful login)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.store.get(identifier);
    if (!record) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - record.attempts);
  }
}
