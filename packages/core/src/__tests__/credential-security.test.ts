import type { UserSecurityMethod } from '@reasvyn/auth-types';

import {
  createOneTimeCodeChallenge,
  createRecoveryCodeRecords,
  createUserSecurityOverview,
  generateOneTimeCode,
  generateRecoveryCodes,
  hashOneTimeCode,
  hashRecoveryCodes,
  redactDestination,
  verifyOneTimeCodeHash,
  verifyRecoveryCode,
} from '../security/credential-security';

describe('credential security helpers', () => {
  it('generates numeric one-time codes with the expected length', () => {
    const code = generateOneTimeCode();

    expect(code).toMatch(/^\d{6}$/);
  });

  it('hashes and verifies one-time codes with timing-safe comparison', () => {
    const hash = hashOneTimeCode('123456', { secret: 'test-secret' });

    expect(verifyOneTimeCodeHash('123456', hash, { secret: 'test-secret' })).toBe(true);
    expect(verifyOneTimeCodeHash('654321', hash, { secret: 'test-secret' })).toBe(false);
  });

  it('generates recovery codes without ambiguous characters', () => {
    const codes = generateRecoveryCodes({ count: 3 });

    expect(codes).toHaveLength(3);
    expect(codes[0]).toMatch(/^[23456789A-HJ-NP-Z]{5}-[23456789A-HJ-NP-Z]{5}$/);
  });

  it('hashes and verifies recovery codes using password hashing', async () => {
    const codes = generateRecoveryCodes({ count: 2 });
    const hashes = await hashRecoveryCodes(codes);

    const result = await verifyRecoveryCode(codes[0], hashes);

    expect(result.valid).toBe(true);
    expect(result.nextHashes).toHaveLength(1);
    expect(result.matchedHash).toBeDefined();
  });

  it('creates recovery code records with only a safe hint', () => {
    const records = createRecoveryCodeRecords(['ABCDE-FGHIJ']);

    expect(records[0]).toMatchObject({
      hint: 'GHIJ',
    });
    expect(records[0].id).toBeTruthy();
  });

  it('redacts email and phone destinations', () => {
    expect(redactDestination('user@example.com')).toBe('us**@example.com');
    expect(redactDestination('+628123456789')).toMatch(/\*+6789$/);
  });

  it('creates one-time code challenges with redacted destinations', () => {
    const challenge = createOneTimeCodeChallenge({
      purpose: 'mfa_challenge',
      method: 'email',
      userId: 'user_1',
      destination: 'user@example.com',
    });

    expect(challenge.id).toBeTruthy();
    expect(challenge.destination).toBe('us**@example.com');
    expect(challenge.attemptsRemaining).toBeGreaterThan(0);
  });

  it('creates a security overview with actionable recommendations', () => {
    const methods: UserSecurityMethod[] = [
      {
        id: 'method_1',
        userId: 'user_1',
        type: 'password',
        status: 'enabled',
        isPrimary: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const overview = createUserSecurityOverview({
      userId: 'user_1',
      userStatus: 'active',
      emailVerified: false,
      passwordConfigured: true,
      passwordLastChangedAt: new Date('2023-01-01T00:00:00Z'),
      failedLoginAttempts: 2,
      methods,
      recoveryCodesRemaining: 0,
    });

    expect(overview.methods[0]?.type).toBe('password');
    expect(overview.recommendations).toContain('Verify the account email address.');
    expect(overview.recommendations).toContain('Enable TOTP multi-factor authentication.');
    expect(overview.recommendations).toContain(
      'Generate new recovery codes and store them offline.',
    );
  });
});
