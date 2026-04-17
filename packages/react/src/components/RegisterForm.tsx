import React, { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useUser';
import type { RegisterFormProps } from '../types';

import { OAuthButton } from './OAuthButton';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Card, Heading, Subheading, ErrorAlert, Field, Input, Button, Divider } from './ui';

export function RegisterForm({ onSuccess, onError, providers = [], className }: RegisterFormProps) {
  const auth = useAuth();
  const { values, handleChange, submitting, setSubmitting } = useFormState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();
    setLocalError(null);

    if (values.password !== values.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await auth.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError ?? auth.error;

  return (
    <Card className={className}>
      <Heading>Create account</Heading>
      <Subheading>Start your journey today</Subheading>

      <div className="flex flex-col gap-4">
        {displayError && <ErrorAlert message={displayError} />}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Full name" id="reg-name">
            <Input
              id="reg-name"
              type="text"
              value={values.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </Field>

          <Field label="Email" id="reg-email">
            <Input
              id="reg-email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Password" id="reg-password">
            <Input
              id="reg-password"
              type="password"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <PasswordStrengthIndicator password={values.password} />
          </Field>

          <Field label="Confirm password" id="reg-confirm">
            <Input
              id="reg-confirm"
              type="password"
              value={values.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" loading={submitting || auth.status === 'loading'}>
            Create account
          </Button>
        </form>

        {providers.length > 0 && (
          <>
            <Divider label="or continue with" />
            <div className="flex flex-col gap-2">
              {providers.map((p) => (
                <OAuthButton key={p} provider={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
