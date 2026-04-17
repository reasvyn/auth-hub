/**
 * Email verification logic
 */

import { createHmac, randomBytes } from 'crypto';

export interface EmailVerificationToken {
  token: string;
  email: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Generate an email verification token
 */
export function generateEmailVerificationToken(
  userId: string,
  email: string,
  secret: string,
  expiresIn: number = 24 * 60 * 60 * 1000,
): EmailVerificationToken {
  const random = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresIn);
  const payload = `${userId}:${email}:${expiresAt.getTime()}:${random}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');

  return { token, email, userId, expiresAt };
}

/**
 * Verify an email verification token
 */
export function verifyEmailVerificationToken(
  token: string,
  secret: string,
): { valid: boolean; userId?: string; email?: string; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');

    if (parts.length !== 5) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [userId, email, expiresAtStr, random, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'Token expired' };
    }

    const payload = `${userId}:${email}:${expiresAtStr}:${random}`;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    return { valid: true, userId, email };
  } catch {
    return { valid: false, reason: 'Token parsing failed' };
  }
}
