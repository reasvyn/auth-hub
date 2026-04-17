/**
 * Password hashing utilities using bcryptjs
 */

import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 */
export async function hashPassword(password: string, rounds: number = DEFAULT_ROUNDS): Promise<string> {
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a plaintext password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Returns an array of validation messages (empty = valid)
 */
export function validatePasswordStrength(
  password: string,
  options: PasswordStrengthOptions = {},
): PasswordStrengthResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  const score = calculatePasswordScore(password);

  return {
    isValid: errors.length === 0,
    errors,
    score,
    strength: getStrengthLabel(score),
  };
}

function calculatePasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;
  return Math.min(score, 8);
}

function getStrengthLabel(score: number): 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong' {
  if (score <= 1) return 'very_weak';
  if (score <= 3) return 'weak';
  if (score <= 5) return 'fair';
  if (score <= 7) return 'strong';
  return 'very_strong';
}

export interface PasswordStrengthOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export interface PasswordStrengthResult {
  isValid: boolean;
  errors: string[];
  score: number;
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
}
