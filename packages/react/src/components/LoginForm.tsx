import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useUser';
import { OAuthButton } from './OAuthButton';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Card, Heading, Subheading, ErrorAlert, Field, Input, Button, TextButton, Divider } from './ui';
import type { LoginFormProps } from '../types';

export function LoginForm({
  onSuccess,
  onError,
  providers = [],
  enableMagicLink = false,
  className,
}: LoginFormProps) {
  const { login, sendMagicLink, status, error, clearError } = useAuth();
  const { values, handleChange, submitting, setSubmitting } = useFormState({ email: '', password: '' });
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      if (magicLinkMode) {
        await sendMagicLink(values.email);
        setMagicLinkSent(true);
      } else {
        await login({ email: values.email, password: values.password });
        onSuccess?.({ user: null as any, accessToken: '', refreshToken: '' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (magicLinkSent) {
    return (
      <Card className={className}>
        <div className="text-center text-4xl mb-4">📬</div>
        <Heading>Check your email</Heading>
        <Subheading>
          We sent a magic link to <strong className="text-gray-700 dark:text-gray-200">{values.email}</strong>.
          Click the link to sign in.
        </Subheading>
        <TextButton onClick={() => { setMagicLinkSent(false); setMagicLinkMode(false); }}>
          Back to login
        </TextButton>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Heading>{magicLinkMode ? 'Sign in with Magic Link' : 'Sign in'}</Heading>
      {!magicLinkMode && <Subheading>Welcome back</Subheading>}

      <div className="flex flex-col gap-4">
        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email" id="login-email">
            <Input
              id="login-email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          {!magicLinkMode && (
            <Field label="Password" id="login-password">
              <Input
                id="login-password"
                type="password"
                value={values.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
          )}

          <Button
            type="submit"
            loading={submitting || status === 'loading'}
          >
            {magicLinkMode ? 'Send Magic Link' : 'Sign in'}
          </Button>
        </form>

        {enableMagicLink && (
          <div className="text-center">
            <TextButton onClick={() => setMagicLinkMode((v) => !v)}>
              {magicLinkMode ? 'Sign in with password instead' : 'Sign in with magic link'}
            </TextButton>
          </div>
        )}

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
