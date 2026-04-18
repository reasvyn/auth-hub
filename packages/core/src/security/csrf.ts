/**
 * CSRF token generation and validation utilities
 */

import { createHmac, randomBytes } from 'crypto';

import type { CSRFToken } from '@reasvyn/auth-types';

/**
 * Generate a CSRF token signed with a secret
 */
export function generateCSRFToken(secret: string, expiresIn: number = 3600 * 1000): CSRFToken {
  const random = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresIn);
  const payload = `${random}:${expiresAt.getTime()}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = `${payload}:${signature}`;

  return { token, expiresAt };
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(
  token: string,
  secret: string,
): { valid: boolean; reason?: string } {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [random, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'Token expired' };
    }

    const payload = `${random}:${expiresAtStr}`;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Token parsing failed' };
  }
}
