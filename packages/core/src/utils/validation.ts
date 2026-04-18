/**
 * Validation helper utilities using zod
 */

import { z } from 'zod';

import type { ValidationError } from '@reasvyn/auth-types';

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
