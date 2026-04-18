import { useState } from 'react';
import type { FormEvent } from 'react';

import type { MFAVerifyFormProps } from '../types';

import { Card, Heading, Subheading, ErrorAlert, Field, Input, Button, TextButton } from './ui';

export function MFAVerifyForm({
  method = 'totp',
  onVerify,
  onSuccess,
  onError,
  onBack,
  className,
}: MFAVerifyFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = onVerify ? await onVerify(code, method) : undefined;
      onSuccess?.(response ?? undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel: Record<typeof method, string> = {
    totp: 'authenticator app',
    sms: 'SMS',
    email: 'email',
  };

  return (
    <Card className={className}>
      <div className="text-center text-4xl mb-4">🔑</div>
      <Heading>Two-factor authentication</Heading>
      <Subheading>Enter the 6-digit code from your {methodLabel[method]}.</Subheading>

      <div className="flex flex-col gap-4">
        {error && <ErrorAlert message={error} />}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Verification code" id="mfa-verify-code">
            <Input
              id="mfa-verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="123456"
              autoComplete="one-time-code"
              className="tracking-widest text-center text-lg font-mono"
              autoFocus
            />
          </Field>

          <Button type="submit" loading={submitting} disabled={code.length < 6}>
            Verify
          </Button>
        </form>

        {onBack && (
          <div className="text-center">
            <TextButton onClick={onBack}>Try another method</TextButton>
          </div>
        )}
      </div>
    </Card>
  );
}
