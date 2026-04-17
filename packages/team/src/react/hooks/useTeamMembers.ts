import { useCallback, useEffect, useState } from 'react';
import type { TeamMember, TeamRole } from '../../types';
import { useTeam } from './useTeam';
import { canChangeRole, canRemoveMember } from '../../utils';

export interface UseTeamMembersReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  /** Add a user to the current team */
  addMember(userId: string, role: TeamRole): Promise<void>;
  /** Remove a member from the current team */
  removeMember(userId: string): Promise<void>;
  /** Change a member's role */
  updateRole(userId: string, role: TeamRole): Promise<void>;
  /** Whether the current user can remove the given member */
  canRemove(targetRole: TeamRole): boolean;
  /** Whether the current user can change a member's role to the given new role */
  canChangeRoleTo(currentMemberRole: TeamRole, newRole: TeamRole): boolean;
  refresh(): Promise<void>;
}

/**
 * Manage members of the current team.
 *
 * @example
 * function MembersPage() {
 *   const { members, removeMember } = useTeamMembers();
 *   return members.map(m => (
 *     <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.userId)} />
 *   ));
 * }
 */
export function useTeamMembers(): UseTeamMembersReturn {
  const { currentTeam, currentRole, adapter } = useTeam();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await adapter.listMembers(currentTeam.id);
      setMembers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, currentTeam]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addMember = useCallback(async (userId: string, role: TeamRole) => {
    if (!currentTeam) throw new Error('No active team');
    const member = await adapter.addMember(currentTeam.id, userId, role);
    setMembers((prev) => [...prev, member]);
  }, [adapter, currentTeam]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentTeam) throw new Error('No active team');
    await adapter.removeMember(currentTeam.id, userId);
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }, [adapter, currentTeam]);

  const updateRole = useCallback(async (userId: string, role: TeamRole) => {
    if (!currentTeam) throw new Error('No active team');
    const updated = await adapter.updateMemberRole(currentTeam.id, userId, role);
    setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
  }, [adapter, currentTeam]);

  return {
    members,
    isLoading,
    error,
    addMember,
    removeMember,
    updateRole,
    canRemove: (targetRole) => currentRole ? canRemoveMember(currentRole, targetRole) : false,
    canChangeRoleTo: (cur, next) => currentRole ? canChangeRole(currentRole, cur, next) : false,
    refresh,
  };
}
