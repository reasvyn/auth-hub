import { useContext } from 'react';
import { TeamContext } from '../context/TeamContext';
import type { TeamContextValue } from '../context/TeamContext';

/**
 * Access team context. Must be inside <TeamProvider>.
 *
 * @example
 * function Header() {
 *   const { currentTeam, switchTeam, teams } = useTeam();
 *   return <TeamSwitcher />;
 * }
 */
export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('[auth-team] useTeam must be used inside <TeamProvider>');
  return ctx;
}
