import { createContext } from 'react';
import type { Team, TeamRole, TeamState } from '../../types';
import type { TeamAdapter } from '../../adapter';

export interface TeamContextValue extends TeamState {
  adapter: TeamAdapter;
  /** Switch the active team */
  switchTeam(teamId: string): void;
  /** Refresh teams list */
  refreshTeams(): Promise<void>;
  /** Create a new team and switch to it */
  createTeam(data: { name: string; description?: string; avatarUrl?: string }): Promise<Team>;
  /** Update the current team */
  updateTeam(data: { name?: string; description?: string; avatarUrl?: string }): Promise<Team>;
  /** Delete the current team (owner only) */
  deleteTeam(): Promise<void>;
  /** Transfer ownership of the current team */
  transferOwnership(newOwnerId: string): Promise<void>;
  clearError(): void;
}

export const TeamContext = createContext<TeamContextValue | null>(null);
