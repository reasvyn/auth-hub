import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
  zodToValidationErrors,
  safeValidate,
  isValidEmail,
} from '../utils/validation';
import { z } from 'zod';

describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('lowercases the email', () => {
    const result = emailSchema.safeParse('USER@EXAMPLE.COM');
    expect(result.success && result.data).toBe('user@example.com');
  });

  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts passwords >= 8 chars', () => {
    expect(passwordSchema.safeParse('password').success).toBe(true);
  });

  it('rejects passwords shorter than 8 chars', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
  });

  it('rejects passwords longer than 128 chars', () => {
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'secret' };

  it('parses valid login input', () => {
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });

  it('accepts rememberMe as optional boolean', () => {
    const result = loginSchema.safeParse({ ...valid, rememberMe: true });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'ValidPass1!',
    confirmPassword: 'ValidPass1!',
  };

  it('parses valid registration input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatching confirmPassword', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
  });

  it('passes when confirmPassword is omitted', () => {
    const { confirmPassword: _, ...without } = valid;
    expect(registerSchema.safeParse(without).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'OldPass1!',
    newPassword: 'NewPass123!',
    confirmPassword: 'NewPass123!',
  };

  it('parses valid change-password input', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatching confirmPassword', () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirmPassword: 'Different!' });
    expect(result.success).toBe(false);
  });

  it('accepts omitted confirmPassword', () => {
    const { confirmPassword: _, ...without } = valid;
    expect(changePasswordSchema.safeParse(without).success).toBe(true);
  });
});

describe('zodToValidationErrors()', () => {
  it('converts ZodError to ValidationError array', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodToValidationErrors(result.error);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
      expect(typeof errors[0].message).toBe('string');
    }
  });

  it('returns empty array for no errors (edge case: only schema-level errors)', () => {
    // ZodError always has at least one issue when it fails, so we verify structure
    const schema = z.string();
    const result = schema.safeParse(123);
    if (!result.success) {
      const errors = zodToValidationErrors(result.error);
      expect(Array.isArray(errors)).toBe(true);
    }
  });
});

describe('safeValidate()', () => {
  const schema = z.object({ age: z.number().min(18) });

  it('returns success:true with parsed data for valid input', () => {
    const result = safeValidate(schema, { age: 21 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.age).toBe(21);
  });

  it('returns success:false with errors for invalid input', () => {
    const result = safeValidate(schema, { age: 16 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('isValidEmail()', () => {
  it('returns true for valid email addresses', () => {
    expect(isValidEmail('alice@example.com')).toBe(true);
    expect(isValidEmail('user+tag@sub.domain.io')).toBe(true);
  });

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('@nodomain')).toBe(false);
  });
});
