import { useSession } from '../hooks/useSession';
import type { AuthAdapter, SessionsListProps } from '../types';

import { Card, Heading, ErrorAlert, Button, Spinner } from './ui';

interface SessionsListComponentProps extends SessionsListProps {
  adapter: AuthAdapter;
}

export function SessionsList({
  adapter,
  onRevoke,
  onRevokeAll,
  className,
}: SessionsListComponentProps) {
  const sessionState = useSession(adapter);

  const handleRevoke = async (id: string) => {
    await sessionState.revoke(id);
    onRevoke?.(id);
  };

  const handleRevokeAll = async () => {
    await sessionState.revokeAll();
    onRevokeAll?.();
  };

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <Heading>Active sessions</Heading>
        {sessionState.sessions.length > 1 && (
          <Button
            variant="secondary"
            onClick={() => {
              void handleRevokeAll();
            }}
            className="!w-auto text-xs px-3 py-1.5"
          >
            Revoke all others
          </Button>
        )}
      </div>

      {sessionState.error && <ErrorAlert message={sessionState.error} />}

      {sessionState.loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : sessionState.sessions.length === 0 ? (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">
          No active sessions found.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessionState.sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session.device?.browser ?? 'Unknown browser'}{' '}
                  <span className="text-gray-400 dark:text-gray-500">·</span>{' '}
                  {session.device?.os ?? 'Unknown OS'}
                </p>
                {session.device?.ipAddress && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.device.ipAddress}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Last active:{' '}
                  {session.lastActivityAt
                    ? new Date(session.lastActivityAt).toLocaleString()
                    : 'Unknown'}
                </p>
                {session.isCurrent && (
                  <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Current session
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleRevoke(session.id);
                }}
                className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline cursor-pointer bg-transparent border-none"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
