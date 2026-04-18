import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  OneTimeCodeChallenge,
  OneTimeCodePurpose,
  RecoveryCode,
  SecurityMethodType,
  TwoFactorMethod,
  UserSecurityMethod,
  UserSecurityOverview,
  UserStatus,
} from '@reasvyn/auth-types';

import { AUTH_CONSTANTS } from '../utils/constants';

import { hashPassword, verifyPassword } from './password';

const RECOVERY_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const OTP_DIGITS = '0123456789';

export interface OneTimeCodeGenerationOptions {
  length?: number;
  alphabet?: string;
}

export interface OneTimeCodeHashOptions {
  secret?: string;
  algorithm?: 'sha256' | 'sha512';
}

export interface RecoveryCodeGenerationOptions {
  count?: number;
  segments?: number;
  segmentLength?: number;
  alphabet?: string;
}

export interface OneTimeCodeChallengeInput {
  purpose: OneTimeCodePurpose;
  method: TwoFactorMethod;
  userId?: string;
  destination?: string;
  ttlMs?: number;
  attemptsAllowed?: number;
  metadata?: Record<string, unknown>;
}

export interface UserSecurityOverviewInput {
  userId: string;
  userStatus: UserStatus;
  emailVerified: boolean;
  passwordConfigured: boolean;
  passwordLastChangedAt?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  methods?: UserSecurityMethod[];
  recoveryCodesRemaining?: number;
  lastSecurityReviewAt?: Date;
}

export interface VerifyRecoveryCodeResult {
  valid: boolean;
  matchedHash?: string;
  nextHashes: string[];
}

function randomString(length: number, alphabet: string): string {
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomInt(0, alphabet.length)];
  }

  return value;
}

export function generateOneTimeCode(options: OneTimeCodeGenerationOptions = {}): string {
  const { length = AUTH_CONSTANTS.ONE_TIME_CODE_LENGTH, alphabet = OTP_DIGITS } = options;

  return randomString(length, alphabet);
}

export function hashOneTimeCode(code: string, options: OneTimeCodeHashOptions = {}): string {
  const { secret, algorithm = 'sha256' } = options;

  return secret
    ? createHmac(algorithm, secret).update(code).digest('hex')
    : createHash(algorithm).update(code).digest('hex');
}

export function verifyOneTimeCodeHash(
  code: string,
  expectedHash: string,
  options: OneTimeCodeHashOptions = {},
): boolean {
  const calculatedHash = hashOneTimeCode(code, options);
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(calculatedHash, 'hex');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateRecoveryCodes(options: RecoveryCodeGenerationOptions = {}): string[] {
  const {
    count = AUTH_CONSTANTS.BACKUP_CODE_COUNT,
    segments = AUTH_CONSTANTS.RECOVERY_CODE_SEGMENTS,
    segmentLength = AUTH_CONSTANTS.RECOVERY_CODE_SEGMENT_LENGTH,
    alphabet = RECOVERY_CODE_ALPHABET,
  } = options;

  return Array.from({ length: count }, () =>
    Array.from({ length: segments }, () => randomString(segmentLength, alphabet)).join('-'),
  );
}

export function createRecoveryCodeRecords(
  codes: string[],
  createdAt: Date = new Date(),
): RecoveryCode[] {
  return codes.map((code) => ({
    id: randomUUID(),
    hint: code.slice(-4),
    createdAt,
  }));
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(code)));
}

export async function verifyRecoveryCode(
  code: string,
  hashes: string[],
): Promise<VerifyRecoveryCodeResult> {
  for (const hash of hashes) {
    if (await verifyPassword(code, hash)) {
      return {
        valid: true,
        matchedHash: hash,
        nextHashes: hashes.filter((entry) => entry !== hash),
      };
    }
  }

  return { valid: false, nextHashes: hashes };
}

export function redactDestination(destination: string): string {
  if (destination.includes('@')) {
    const [localPart, domain] = destination.split('@');
    if (!localPart || !domain) {
      return '***';
    }

    const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
    return `${visibleLocal}${'*'.repeat(Math.max(0, localPart.length - visibleLocal.length))}@${domain}`;
  }

  const visibleSuffix = destination.slice(-4);
  return `${'*'.repeat(Math.max(0, destination.length - visibleSuffix.length))}${visibleSuffix}`;
}

export function createOneTimeCodeChallenge(
  input: OneTimeCodeChallengeInput,
  createdAt: Date = new Date(),
): OneTimeCodeChallenge {
  const ttlMs = input.ttlMs ?? AUTH_CONSTANTS.ONE_TIME_CODE_EXPIRY_MS;
  const attemptsRemaining = input.attemptsAllowed ?? AUTH_CONSTANTS.ONE_TIME_CODE_MAX_ATTEMPTS;

  const challenge: OneTimeCodeChallenge = {
    id: randomUUID(),
    purpose: input.purpose,
    method: input.method,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.destination ? { destination: redactDestination(input.destination) } : {}),
    expiresAt: new Date(createdAt.getTime() + ttlMs),
    attemptsRemaining,
    createdAt,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  return challenge;
}

function hasEnabledMethod(methods: UserSecurityMethod[], type: SecurityMethodType): boolean {
  return methods.some((method) => method.type === type && method.status === 'enabled');
}

export function createUserSecurityOverview(input: UserSecurityOverviewInput): UserSecurityOverview {
  const methods: UserSecurityMethod[] = input.methods ? [...input.methods] : [];

  methods.sort((left: UserSecurityMethod, right: UserSecurityMethod) => {
    if (left.isPrimary === right.isPrimary) {
      return left.createdAt.getTime() - right.createdAt.getTime();
    }

    return left.isPrimary ? -1 : 1;
  });

  const failedLoginAttempts = input.failedLoginAttempts ?? 0;
  const recoveryCodesRemaining = input.recoveryCodesRemaining ?? 0;
  const recommendations: string[] = [];

  if (!input.emailVerified) {
    recommendations.push('Verify the account email address.');
  }

  if (!input.passwordConfigured) {
    recommendations.push('Configure a strong password credential.');
  }

  if (!hasEnabledMethod(methods, 'totp')) {
    recommendations.push('Enable TOTP multi-factor authentication.');
  }

  if (recoveryCodesRemaining === 0) {
    recommendations.push('Generate new recovery codes and store them offline.');
  }

  if (
    input.passwordLastChangedAt &&
    Date.now() - input.passwordLastChangedAt.getTime() > AUTH_CONSTANTS.PASSWORD_REVIEW_INTERVAL_MS
  ) {
    recommendations.push('Review and rotate the password credential.');
  }

  if (input.lockedUntil && input.lockedUntil.getTime() > Date.now()) {
    recommendations.push('Review recent authentication attempts before unlocking the account.');
  } else if (failedLoginAttempts > 0) {
    recommendations.push('Review recent failed sign-in attempts.');
  }

  const overview: UserSecurityOverview = {
    userId: input.userId,
    userStatus: input.userStatus,
    emailVerified: input.emailVerified,
    passwordConfigured: input.passwordConfigured,
    ...(input.passwordLastChangedAt ? { passwordLastChangedAt: input.passwordLastChangedAt } : {}),
    failedLoginAttempts,
    ...(input.lockedUntil ? { lockedUntil: input.lockedUntil } : {}),
    methods,
    recoveryCodesRemaining,
    ...(input.lastSecurityReviewAt ? { lastSecurityReviewAt: input.lastSecurityReviewAt } : {}),
    recommendations,
  };

  return overview;
}
