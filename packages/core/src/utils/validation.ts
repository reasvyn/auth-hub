/**
 * Validation helper utilities using zod
 */

import type { ValidationError } from '@reasvyn/auth-types';
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    firstName: z.string().max(64).optional(),
    lastName: z.string().max(64).optional(),
    displayName: z.string().max(64).optional(),
    acceptTerms: z.boolean().optional(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const oneTimeCodePurposeSchema = z.enum([
  'email_verification',
  'password_reset',
  'signin_challenge',
  'mfa_challenge',
  'security_method_enrollment',
  'security_method_verification',
]);

const twoFactorMethodSchema = z.enum(['totp', 'sms', 'email']);
const securityMethodTypeSchema = z.enum([
  'password',
  'totp',
  'email_otp',
  'sms_otp',
  'recovery_code',
]);
const recoveryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z2-9-]{6,32}$/i, 'Recovery code format is invalid');

export const requestOneTimeCodeSchema = z.object({
  purpose: oneTimeCodePurposeSchema,
  method: twoFactorMethodSchema,
  destination: z.string().trim().min(1).max(320).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const configureSecurityMethodSchema = z.object({
  method: securityMethodTypeSchema,
  label: z.string().trim().min(1).max(128).optional(),
  destination: z.string().trim().min(1).max(320).optional(),
  isPrimary: z.boolean().optional(),
});

export const verifyOneTimeCodeSchema = z.object({
  challengeId: z.string().trim().min(1, 'Challenge ID is required'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, 'One-time code must contain 6 to 8 digits'),
});

export const verifySecurityMethodSchema = z.object({
  challengeId: z.string().trim().min(1).optional(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{6,32}$/i, 'Verification code format is invalid'),
});

export const disableSecurityMethodSchema = z
  .object({
    verificationCode: recoveryCodeSchema.optional(),
    password: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.verificationCode || data.password), {
    message: 'Password or verification code is required',
    path: ['password'],
  });

export const regenerateRecoveryCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  verificationCode: recoveryCodeSchema.optional(),
});

/**
 * Convert zod errors to ValidationError array
 */
export function zodToValidationErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Safe parse helper that returns typed result
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: zodToValidationErrors(result.error) };
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
