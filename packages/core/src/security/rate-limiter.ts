/**
 * In-memory rate limiter implementation
 */

import type { RateLimitInfo } from '@reasvyn/auth-types';

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.windowMs * 2);
  }

  /**
   * Check and increment the rate limit counter for a key
   */
  check(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        info: {
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          resetAt: new Date(resetAt),
        },
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const allowed = entry.count <= this.maxRequests;

    return {
      allowed,
      info: {
        limit: this.maxRequests,
        remaining,
        resetAt: new Date(entry.resetAt),
        retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
      },
    };
  }

  /**
   * Reset the counter for a key (e.g., after successful login)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current rate limit info for a key without incrementing
   */
  getInfo(key: string): RateLimitInfo {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        resetAt: new Date(now + this.windowMs),
      };
    }

    return {
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: new Date(entry.resetAt),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Create a pre-configured rate limiter for login attempts
 */
export function createLoginRateLimiter(): RateLimiter {
  return new RateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/**
 * Create a pre-configured rate limiter for API requests
 */
export function createApiRateLimiter(): RateLimiter {
  return new RateLimiter({ maxRequests: 100, windowMs: 60 * 1000 });
}
