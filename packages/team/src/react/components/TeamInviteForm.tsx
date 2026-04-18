import React, { useState } from 'react';
import type { TeamRole, TeamInvitation } from '../../types';
import { useTeamInvitations } from '../hooks/useTeamInvitations';
import { MemberRoleBadge } from './MemberRoleBadge';
import { TEAM_ROLES, TEAM_ROLE_LABELS } from '../../utils';

export interface TeamInviteFormProps {
  currentUserId: string;
  /** Base URL for the invite link (e.g. 'https://myapp.com') */
  appBaseUrl?: string;
  onInvited?: (invitation: TeamInvitation) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Invite a user by email with role selection, plus a list of pending invitations.
 */
export function TeamInviteForm({
  currentUserId,
  appBaseUrl,
  onInvited,
  onError,
  className = '',
}: TeamInviteFormProps) {
  const { invitations, isLoading, invite, cancel } = useTeamInvitations(currentUserId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const inv = await invite(email.trim(), role, appBaseUrl);
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail('');
      onInvited?.(inv);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {/* Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          required
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {TEAM_ROLES.filter((r) => r !== 'owner').map((r) => (
            <option key={r} value={r}>
              {TEAM_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting || !email}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Invite'}
        </button>
      </form>

      {/* Feedback */}
      {success && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{success}</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Pending invitations
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Expires {inv.expiresAt.toLocaleDateString()}
                    </p>
                  </div>
                  <MemberRoleBadge role={inv.role} />
                  <button
                    onClick={() => void cancel(inv.id)}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
