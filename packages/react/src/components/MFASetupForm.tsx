import { useState } from 'react';
import type { FormEvent } from 'react';

import type { MFASetupFormProps } from '../types';

import { Card, Heading, Subheading, ErrorAlert, Field, Input, Button, TextButton } from './ui';

export function MFASetupForm({
  method,
  setupData,
  onVerify,
  onSuccess,
  onError,
  onCancel,
  className,
}: MFASetupFormProps) {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const methodLabel =
    method === 'totp' ? 'Authenticator App' : method === 'sms' ? 'SMS' : 'Email';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = onVerify ? await onVerify(code) : undefined;
      onSuccess?.(result ?? setupData ?? undefined);
      setVerified(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
      <Heading>Set up {methodLabel} 2FA</Heading>
      <Subheading>
        {method === 'totp'
          ? 'Scan the QR code with your authenticator app, then enter the 6-digit code.'
          : 'Enter the verification code sent to your account.'}
      </Subheading>

      <div className="flex flex-col gap-4">
        {error && <ErrorAlert message={error} />}

        {/* QR Code placeholder — actual data comes from useMFA().setupData */}
        {setupData?.qrCodeUrl ? (
          <img
            src={setupData.qrCodeUrl}
            alt={`${methodLabel} QR code`}
            className="mx-auto w-full max-w-[180px] rounded-xl border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="flex items-center justify-center w-full aspect-square max-w-[180px] mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-sm">
            QR code here
          </div>
        )}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
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
