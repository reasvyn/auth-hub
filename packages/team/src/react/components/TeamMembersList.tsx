import React, { useState } from 'react';
import type { TeamRole } from '../../types';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useTeam } from '../hooks/useTeam';
import { MemberRoleBadge } from './MemberRoleBadge';
import { TEAM_ROLES, TEAM_ROLE_LABELS, atLeast } from '../../utils';

export interface TeamMembersListProps {
  /** Current authenticated user's ID (to prevent self-removal) */
  currentUserId: string;
  onRemove?: (userId: string) => void;
  onRoleChange?: (userId: string, role: TeamRole) => void;
  className?: string;
}

/**
 * Full member management UI — list, change roles, remove members.
 */
export function TeamMembersList({
  currentUserId,
  onRemove,
  onRoleChange,
  className = '',
}: TeamMembersListProps) {
  const { currentRole } = useTeam();
  const { members, isLoading, error, removeMember, updateRole, canRemove, canChangeRoleTo } =
    useTeamMembers();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeMember(userId);
      onRemove?.(userId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (
    userId: string,
    currentMemberRole: TeamRole,
    newRole: TeamRole,
  ) => {
    if (!canChangeRoleTo(currentMemberRole, newRole)) return;
    setUpdatingId(userId);
    try {
      await updateRole(userId, newRole);
      onRoleChange?.(userId, newRole);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 ${className}`}
      >
        {error}
      </div>
    );
  }

  return (
    <div className={`divide-y divide-gray-100 dark:divide-gray-700 ${className}`}>
      {members.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No members yet.</p>
      )}
      {members.map((member) => {
        const isSelf = member.userId === currentUserId;
        const isOwner = member.role === 'owner';
        const canEdit = !isSelf && !isOwner && currentRole && atLeast(currentRole, 'admin');
        const canDel = !isSelf && !isOwner && canRemove(member.role);

        return (
          <div key={member.id} className="flex items-center gap-3 py-3">
            {/* Avatar */}
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              {member.user?.name?.charAt(0).toUpperCase() ??
                member.user?.email?.charAt(0).toUpperCase() ??
                '?'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {member.user?.name ?? member.userId}
                {isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
              </p>
              {member.user?.email && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {member.user.email}
                </p>
              )}
            </div>

            {/* Role selector / badge */}
            {canEdit ? (
              <select
                value={member.role}
                disabled={updatingId === member.userId}
                onChange={(e) =>
                  void handleRoleChange(member.userId, member.role, e.target.value as TeamRole)
                }
                className="text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TEAM_ROLES.filter((r) => r !== 'owner').map((r) => (
                  <option key={r} value={r} disabled={!canChangeRoleTo(member.role, r)}>
                    {TEAM_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            ) : (
              <MemberRoleBadge role={member.role} />
            )}

            {/* Remove */}
            {canDel && (
              <button
                onClick={() => void handleRemove(member.userId)}
                disabled={removingId === member.userId}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                title="Remove member"
              >
                {removingId === member.userId ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
