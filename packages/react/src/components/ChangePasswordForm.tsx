import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useUser';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Card, Heading, ErrorAlert, SuccessAlert, Field, Input, Button } from './ui';
import type { ChangePasswordFormProps } from '../types';

export function ChangePasswordForm({ onSuccess, onError, className }: ChangePasswordFormProps) {
  const { changePassword } = useAuth();
  const { values, handleChange, submitting, setSubmitting } = useFormState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (values.newPassword !== values.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className={className}>
        <div className="text-center text-4xl mb-4">✅</div>
        <Heading>Password changed</Heading>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Your password has been updated successfully.
        </p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Heading>Change password</Heading>

      <div className="flex flex-col gap-4 mt-4">
        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Current password" id="cp-current">
            <Input
              id="cp-current"
              type="password"
              value={values.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          <Field label="New password" id="cp-new">
            <Input
              id="cp-new"
              type="password"
              value={values.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <PasswordStrengthIndicator password={values.newPassword} />
          </Field>

          <Field label="Confirm new password" id="cp-confirm">
            <Input
              id="cp-confirm"
              type="password"
              value={values.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" loading={submitting}>
            Change password
          </Button>
        </form>
      </div>
    </Card>
  );
}
