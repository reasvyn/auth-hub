import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useUser';
import { Card, Heading, Subheading, ErrorAlert, SuccessAlert, Field, Input, Button, TextButton } from './ui';
import type { ForgotPasswordFormProps } from '../types';

export function ForgotPasswordForm({ onSuccess, onError, onBack, className }: ForgotPasswordFormProps) {
  const { requestPasswordReset } = useAuth();
  const { values, handleChange, submitting, setSubmitting } = useFormState({ email: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Card className={className}>
        <div className="text-center text-4xl mb-4">📧</div>
        <Heading>Check your email</Heading>
        <Subheading>
          We sent a password reset link to{' '}
          <strong className="text-gray-700 dark:text-gray-200">{values.email}</strong>.
        </Subheading>
        {onBack && <TextButton onClick={onBack}>Back to login</TextButton>}
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Heading>Reset password</Heading>
      <Subheading>Enter your email and we'll send you a reset link.</Subheading>

      <div className="flex flex-col gap-4">
        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email" id="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          <Button type="submit" loading={submitting}>
            Send reset link
          </Button>
        </form>

        {onBack && (
          <div className="text-center">
            <TextButton onClick={onBack}>Back to login</TextButton>
          </div>
        )}
      </div>
    </Card>
  );
}
