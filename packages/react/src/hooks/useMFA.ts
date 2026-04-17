import type { AuthResponse, MFASetupData, TwoFactorMethod } from '@reasvyn/auth-types';
import { useCallback, useState } from 'react';

import type { AuthAdapter } from '../types';

interface UseMFAReturn {
  loading: boolean;
  error: string | null;
  setupData: MFASetupData | null;
  setup(method: TwoFactorMethod): Promise<void>;
  verify(code: string, method: TwoFactorMethod): Promise<AuthResponse | null>;
  disable(method: TwoFactorMethod, code: string): Promise<void>;
  clearError(): void;
}

export function useMFA(adapter: AuthAdapter): UseMFAReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);

  const setup = useCallback(
    async (method: TwoFactorMethod) => {
      if (!adapter.setupMFA) throw new Error('setupMFA not configured');
      setLoading(true);
      setError(null);
      try {
        const data = await adapter.setupMFA(method);
        setSetupData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'MFA setup failed');
      } finally {
        setLoading(false);
      }
    },
    [adapter],
  );

  const verify = useCallback(
    async (code: string, method: TwoFactorMethod): Promise<AuthResponse | null> => {
      if (!adapter.verifyMFA) throw new Error('verifyMFA not configured');
      setLoading(true);
      setError(null);
      try {
        const response = await adapter.verifyMFA(code, method);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'MFA verification failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter],
  );

  const disable = useCallback(
    async (method: TwoFactorMethod, code: string) => {
      if (!adapter.disableMFA) throw new Error('disableMFA not configured');
      setLoading(true);
      setError(null);
      try {
        await adapter.disableMFA(method, code);
        setSetupData(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disable MFA');
      } finally {
        setLoading(false);
      }
    },
    [adapter],
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, setupData, setup, verify, disable, clearError };
}
