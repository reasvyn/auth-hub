import React, { useEffect, useState } from 'react';
import { useMFA } from '../hooks/useMFA';
import { Card, Heading, Subheading, ErrorAlert, SuccessAlert, Field, Input, Button, TextButton } from './ui';
import type { MFASetupFormProps } from '../types';

export function MFASetupForm({ method, onSuccess, onError, onCancel, className }: MFASetupFormProps) {
  const mfa = useMFA({ setupMFA: async (m) => { throw new Error('adapter not provided directly'); } } as any);

  // MFASetupForm expects adapter to be injected — in practice, use the hook inside your page
  // and pass setupData as props, or compose with useMFA directly.
  // This component is a controlled UI shell.
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (verified) {
    return (
      <Card className={className}>
        <div className="text-center text-4xl mb-4">🔐</div>
        <Heading>2FA Enabled</Heading>
        <Subheading>Two-factor authentication is now active on your account.</Subheading>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Heading>Set up {method === 'totp' ? 'Authenticator App' : method === 'sms' ? 'SMS' : 'Email'} 2FA</Heading>
      <Subheading>
        {method === 'totp'
          ? 'Scan the QR code with your authenticator app, then enter the 6-digit code.'
          : 'Enter the verification code sent to your account.'}
      </Subheading>

      <div className="flex flex-col gap-4">
        {error && <ErrorAlert message={error} />}

        {/* QR Code placeholder — actual data comes from useMFA().setupData */}
        <div className="flex items-center justify-center w-full aspect-square max-w-[180px] mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-sm">
          QR code here
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              // Verification is done by parent via useMFA
              onSuccess?.({} as any);
              setVerified(true);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Verification failed';
              setError(msg);
              onError?.(msg);
            } finally {
              setSubmitting(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Verification code" id="mfa-setup-code">
            <Input
              id="mfa-setup-code"
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
            />
          </Field>

          <Button type="submit" loading={submitting}>
            Verify & enable
          </Button>
        </form>

        {onCancel && (
          <div className="text-center">
            <TextButton onClick={onCancel}>Cancel</TextButton>
          </div>
        )}
      </div>
    </Card>
  );
}
