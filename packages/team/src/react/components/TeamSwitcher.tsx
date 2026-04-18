import React, { useRef, useState } from 'react';
import { useTeam } from '../hooks/useTeam';
import { MemberRoleBadge } from './MemberRoleBadge';

export interface TeamSwitcherProps {
  /** Called after team switch */
  onSwitch?: (teamId: string) => void;
  /** Show "Create team" option */
  showCreate?: boolean;
  /** Called when "Create team" is clicked */
  onCreateClick?: () => void;
  className?: string;
}

/**
 * Dropdown to switch between the user's teams.
 *
 * @example
 * <TeamSwitcher showCreate onCreateClick={() => setShowCreateModal(true)} />
 */
export function TeamSwitcher({
  onSwitch,
  showCreate = true,
  onCreateClick,
  className = '',
}: TeamSwitcherProps) {
  const { currentTeam, teams, currentRole, switchTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSwitch = (teamId: string) => {
    void switchTeam(teamId);
    onSwitch?.(teamId);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-800 dark:text-gray-100 w-full"
      >
        {/* Avatar */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
          {currentTeam?.name.charAt(0).toUpperCase() ?? '?'}
        </span>
        <span className="flex-1 text-left truncate">{currentTeam?.name ?? 'No team'}</span>
        {currentRole && <MemberRoleBadge role={currentRole} />}
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 min-w-[200px]">
            {teams.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No teams yet</p>
            )}
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSwitch(team.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentTeam?.id === team.id ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {team.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{team.name}</span>
                {currentTeam?.id === team.id && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}

            {showCreate && (
              <>
                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => {
                    setOpen(false);
                    onCreateClick?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
                    +
                  </span>
                  <span>Create team</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
