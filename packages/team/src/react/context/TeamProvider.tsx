import React, { useCallback, useEffect, useReducer } from 'react';
import type { Team, TeamState } from '../../types';
import type { TeamAdapter } from '../../adapter';
import { slugify } from '../../utils';
import { TeamContext } from './TeamContext';

// ─── Reducer ───────────────────────────────────────────────────────────────

type TeamAction =
  | { type: 'SET_LOADING' }
  | {
      type: 'SET_TEAMS';
      teams: Team[];
      currentTeam: Team | null;
      currentRole: TeamState['currentRole'];
    }
  | { type: 'SET_CURRENT'; team: Team; role: TeamState['currentRole'] }
  | { type: 'UPSERT_TEAM'; team: Team }
  | { type: 'REMOVE_TEAM'; teamId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const initialState: TeamState = {
  currentTeam: null,
  teams: [],
  currentRole: null,
  isLoading: true,
  error: null,
};

function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SET_TEAMS':
      return {
        ...state,
        isLoading: false,
        teams: action.teams,
        currentTeam: action.currentTeam,
        currentRole: action.currentRole,
        error: null,
      };
    case 'SET_CURRENT':
      return { ...state, currentTeam: action.team, currentRole: action.role };
    case 'UPSERT_TEAM': {
      const exists = state.teams.some((t) => t.id === action.team.id);
      const teams = exists
        ? state.teams.map((t) => (t.id === action.team.id ? action.team : t))
        : [...state.teams, action.team];
      const currentTeam =
        state.currentTeam?.id === action.team.id ? action.team : state.currentTeam;
      return { ...state, teams, currentTeam };
    }
    case 'REMOVE_TEAM': {
      const teams = state.teams.filter((t) => t.id !== action.teamId);
      const currentTeam =
        state.currentTeam?.id === action.teamId ? (teams[0] ?? null) : state.currentTeam;
      return { ...state, teams, currentTeam };
    }
    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────

export interface TeamProviderProps {
  adapter: TeamAdapter;
  /** Current authenticated user ID */
  userId: string | null;
  /** Persist the active team ID (e.g. in localStorage). Key used for storage. */
  storageKey?: string;
  children: React.ReactNode;
}

export function TeamProvider({
  adapter,
  userId,
  storageKey = 'auth_current_team',
  children,
}: TeamProviderProps) {
  const [state, dispatch] = useReducer(teamReducer, initialState);

  // ─── Load teams on mount / userId change ─────────────────────────────
  const refreshTeams = useCallback(async () => {
    if (!userId) {
      dispatch({ type: 'SET_TEAMS', teams: [], currentTeam: null, currentRole: null });
      return;
    }
    dispatch({ type: 'SET_LOADING' });
    try {
      const teams = await adapter.listUserTeams(userId);
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      const current = (storedId ? teams.find((t) => t.id === storedId) : null) ?? teams[0] ?? null;

      let currentRole: TeamState['currentRole'] = null;
      if (current) {
        const member = await adapter.getMember(current.id, userId);
        currentRole = member?.role ?? null;
      }

      dispatch({ type: 'SET_TEAMS', teams, currentTeam: current, currentRole });
      if (current && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, current.id);
      }
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to load teams',
      });
    }
  }, [adapter, userId, storageKey]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  // ─── Switch team ─────────────────────────────────────────────────────
  const switchTeam = useCallback(
    async (teamId: string) => {
      const team = state.teams.find((t) => t.id === teamId);
      if (!team || !userId) return;
      const member = await adapter.getMember(teamId, userId);
      dispatch({ type: 'SET_CURRENT', team, role: member?.role ?? null });
      if (typeof window !== 'undefined') localStorage.setItem(storageKey, teamId);
    },
    [adapter, state.teams, userId, storageKey],
  );

  // ─── Create team ─────────────────────────────────────────────────────
  const createTeam = useCallback(
    async (data: { name: string; description?: string; avatarUrl?: string }): Promise<Team> => {
      if (!userId) throw new Error('Not authenticated');
      const team = await adapter.createTeam({
        ...data,
        slug: slugify(data.name),
        ownerId: userId,
      });
      // Owner is automatically a member
      await adapter.addMember(team.id, userId, 'owner');
      dispatch({ type: 'UPSERT_TEAM', team });
      dispatch({ type: 'SET_CURRENT', team, role: 'owner' });
      if (typeof window !== 'undefined') localStorage.setItem(storageKey, team.id);
      return team;
    },
    [adapter, userId, storageKey],
  );

  // ─── Update team ─────────────────────────────────────────────────────
  const updateTeam = useCallback(
    async (data: { name?: string; description?: string; avatarUrl?: string }): Promise<Team> => {
      if (!state.currentTeam) throw new Error('No active team');
      const updated = await adapter.updateTeam(state.currentTeam.id, data);
      dispatch({ type: 'UPSERT_TEAM', team: updated });
      return updated;
    },
    [adapter, state.currentTeam],
  );

  // ─── Delete team ─────────────────────────────────────────────────────
  const deleteTeam = useCallback(async () => {
    if (!state.currentTeam) throw new Error('No active team');
    await adapter.deleteTeam(state.currentTeam.id);
    dispatch({ type: 'REMOVE_TEAM', teamId: state.currentTeam.id });
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
  }, [adapter, state.currentTeam, storageKey]);

  // ─── Transfer ownership ──────────────────────────────────────────────
  const transferOwnership = useCallback(
    async (newOwnerId: string) => {
      if (!state.currentTeam || !userId) throw new Error('No active team');
      await adapter.updateMemberRole(state.currentTeam.id, newOwnerId, 'owner');
      await adapter.updateMemberRole(state.currentTeam.id, userId, 'admin');
      const updated = await adapter.updateTeam(state.currentTeam.id, {});
      dispatch({ type: 'UPSERT_TEAM', team: updated });
      dispatch({ type: 'SET_CURRENT', team: updated, role: 'admin' });
    },
    [adapter, state.currentTeam, userId],
  );

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <TeamContext.Provider
      value={{
        ...state,
        adapter,
        switchTeam,
        refreshTeams,
        createTeam,
        updateTeam,
        deleteTeam,
        transferOwnership,
        clearError,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
