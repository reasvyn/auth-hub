import { hashPassword, verifyPassword, validatePasswordStrength } from '../security/password';

describe('hashPassword / verifyPassword', () => {
  const password = 'MyP@ssw0rd!';

  it('returns a non-empty hash', async () => {
    const hash = await hashPassword(password);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('hash is not equal to the plaintext password', async () => {
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const h1 = await hashPassword(password);
    const h2 = await hashPassword(password);
    expect(h1).not.toBe(h2);
  });

  it('verifyPassword returns true for matching password', async () => {
    const hash = await hashPassword(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword(password);
    await expect(verifyPassword('wrongpassword', hash)).resolves.toBe(false);
  });
});

describe('validatePasswordStrength()', () => {
  it('validates a strong password', () => {
    const result = validatePasswordStrength('MyStr0ng!Pass');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(['fair', 'strong', 'very_strong']).toContain(result.strength);
  });

  it('fails when password is too short', () => {
    const result = validatePasswordStrength('Abc1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('8 characters'))).toBe(true);
  });

  it('fails when missing uppercase', () => {
    const result = validatePasswordStrength('myp@ssw0rd!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
  });

  it('fails when missing lowercase', () => {
    const result = validatePasswordStrength('MYP@SSW0RD!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
  });

  it('fails when missing number', () => {
    const result = validatePasswordStrength('MyP@ssword!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('number'))).toBe(true);
  });

  it('fails when missing special char', () => {
    const result = validatePasswordStrength('MyPassw0rd');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('special'))).toBe(true);
  });

  it('respects custom minLength option', () => {
    const result = validatePasswordStrength('Aa1!', { minLength: 4 });
    expect(result.isValid).toBe(true);
  });

  it('returns score as a number between 0 and 8', () => {
    const result = validatePasswordStrength('MyStr0ng!Pass');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(8);
  });

  it('very_weak for short simple password', () => {
    const result = validatePasswordStrength('a', {
      minLength: 1,
      requireUppercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
    });
    expect(result.strength).toBe('very_weak');
  });
});
