import React from 'react';
import type { TeamRole } from '../../types';
import { TEAM_ROLE_LABELS } from '../../utils';

const ROLE_STYLES: Record<TeamRole, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  member: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export interface MemberRoleBadgeProps {
  role: TeamRole;
  className?: string;
}

export function MemberRoleBadge({ role, className = '' }: MemberRoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[role]} ${className}`}
    >
      {TEAM_ROLE_LABELS[role]}
    </span>
  );
}
