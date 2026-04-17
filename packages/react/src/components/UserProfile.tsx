import React from 'react';
import { useUser } from '../hooks/useUser';
import { Card, Heading, Subheading, ErrorAlert, SuccessAlert, Button } from './ui';
import type { UserProfileProps } from '../types';

export function UserProfile({ className }: UserProfileProps) {
  const { user, displayName, avatarUrl, isEmailVerified, isMFAEnabled } = useUser();

  if (!user) return null;

  const avatar = avatarUrl();
  const name = displayName();

  return (
    <Card className={className}>
      <div className="flex flex-col items-center gap-3 mb-6">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/30"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ProfileRow label="Role" value={<Badge>{user.role}</Badge>} />
        <ProfileRow
          label="Email verification"
          value={
            isEmailVerified() ? (
              <Badge color="green">Verified</Badge>
            ) : (
              <Badge color="red">Not verified</Badge>
            )
          }
        />
        <ProfileRow
          label="Two-factor auth"
          value={
            isMFAEnabled() ? (
              <Badge color="green">Enabled</Badge>
            ) : (
              <Badge color="gray">Disabled</Badge>
            )
          }
        />
        <ProfileRow label="Status" value={<Badge>{user.status}</Badge>} />
        <ProfileRow
          label="Member since"
          value={
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          }
        />
      </div>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      {value}
    </div>
  );
}

type BadgeColor = 'indigo' | 'green' | 'red' | 'gray' | 'yellow';
function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: BadgeColor }) {
  const colors: Record<BadgeColor, string> = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
