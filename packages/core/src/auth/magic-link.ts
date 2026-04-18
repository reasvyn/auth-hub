/**
 * Magic link generation and validation utilities
 */

import { createHmac, randomBytes } from 'crypto';

export interface MagicLinkOptions {
  secret: string;
  expiresIn?: number;
  baseUrl?: string;
}

export interface MagicLinkToken {
  token: string;
  email: string;
  expiresAt: Date;
  url?: string;
}

/**
 * Generate a magic link token for an email address
 */
export function generateMagicLinkToken(email: string, options: MagicLinkOptions): MagicLinkToken {
  const { secret, expiresIn = 15 * 60 * 1000, baseUrl } = options;

  const expiresAt = new Date(Date.now() + expiresIn);
  const random = randomBytes(32).toString('hex');
  const payload = `${email}:${expiresAt.getTime()}:${random}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');

  const url = baseUrl ? `${baseUrl}?token=${encodeURIComponent(token)}` : undefined;

  return {
    token,
    email,
    expiresAt,
    ...(url ? { url } : {}),
  };
}

/**
 * Verify a magic link token
 */
export function verifyMagicLinkToken(
  token: string,
  secret: string,
): { valid: boolean; email?: string; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');

    if (parts.length !== 4) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [email, expiresAtStr, random, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'Token expired' };
    }

    const payload = `${email}:${expiresAtStr}:${random}`;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    return { valid: true, email };
  } catch {
    return { valid: false, reason: 'Token parsing failed' };
  }
}
