import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@reasvyn/auth-types';
import { useAuth } from './useAuth';
import type { AuthAdapter } from '../types';

interface UseSessionReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  revoke(sessionId: string): Promise<void>;
  revokeAll(): Promise<void>;
}

export function useSession(adapter: AuthAdapter): UseSessionReturn {
  const { status } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!adapter.getSessions) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adapter.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    if (status === 'authenticated') void refresh();
  }, [status, refresh]);

  const revoke = useCallback(
    async (sessionId: string) => {
      if (!adapter.revokeSession) throw new Error('revokeSession not configured');
      await adapter.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [adapter],
  );

  const revokeAll = useCallback(async () => {
    if (!adapter.revokeAllSessions) throw new Error('revokeAllSessions not configured');
    await adapter.revokeAllSessions();
    setSessions([]);
  }, [adapter]);

  return { sessions, loading, error, refresh, revoke, revokeAll };
}
