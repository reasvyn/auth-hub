import { useCallback, useEffect, useState } from 'react';
import type { TeamInvitation, TeamRole, InvitationStatus } from '../../types';
import { useTeam } from './useTeam';
import { generateInviteToken, computeExpiresAt } from '../../utils';

export interface UseTeamInvitationsReturn {
  invitations: TeamInvitation[];
  isLoading: boolean;
  error: string | null;
  /** Send an invitation email to the given address */
  invite(email: string, role: TeamRole, appBaseUrl?: string): Promise<TeamInvitation>;
  /** Cancel a pending invitation */
  cancel(invitationId: string): Promise<void>;
  /** Accept an invitation by token (typically called on the invite landing page) */
  accept(token: string, userId: string): Promise<void>;
  /** Decline an invitation by token */
  decline(token: string): Promise<void>;
  refresh(): Promise<void>;
}

/**
 * Manage invitations for the current team.
 *
 * @example
 * function InvitePage() {
 *   const { invite, invitations } = useTeamInvitations();
 *   return <TeamInviteForm onInvite={(email, role) => invite(email, role)} />;
 * }
 */
export function useTeamInvitations(userId: string): UseTeamInvitationsReturn {
  const { currentTeam, adapter } = useTeam();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await adapter.listInvitations(currentTeam.id, 'pending');
      setInvitations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, currentTeam]);

  useEffect(() => { void refresh(); }, [refresh]);

  const invite = useCallback(
    async (email: string, role: TeamRole, appBaseUrl = ''): Promise<TeamInvitation> => {
      if (!currentTeam) throw new Error('No active team');
      const token = generateInviteToken();
      const expiresAt = computeExpiresAt();
      const invitation = await adapter.createInvitation({
        teamId: currentTeam.id,
        email,
        role,
        invitedBy: userId,
        token,
      });

      if (adapter.sendInvitationEmail) {
        const inviteUrl = `${appBaseUrl}/invitations/${token}`;
        await adapter.sendInvitationEmail(invitation, currentTeam, inviteUrl).catch(() => {
          // Non-fatal — invitation record already created
        });
      }

      setInvitations((prev) => [...prev, invitation]);
      void expiresAt; // already embedded by adapter
      return invitation;
    },
    [adapter, currentTeam, userId],
  );

  const cancel = useCallback(async (invitationId: string) => {
    await adapter.updateInvitationStatus(invitationId, 'cancelled');
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }, [adapter]);

  const accept = useCallback(
    async (token: string, acceptingUserId: string) => {
      const invitation = await adapter.getInvitationByToken(token);
      if (!invitation) throw new Error('Invitation not found');
      if (invitation.status !== 'pending') throw new Error('Invitation is no longer valid');
      if (new Date() > invitation.expiresAt) {
        await adapter.updateInvitationStatus(invitation.id, 'expired');
        throw new Error('Invitation has expired');
      }
      await adapter.addMember(invitation.teamId, acceptingUserId, invitation.role);
      await adapter.updateInvitationStatus(invitation.id, 'accepted');
      setInvitations((prev) => prev.filter((i) => i.token !== token));
    },
    [adapter],
  );

  const decline = useCallback(async (token: string) => {
    const invitation = await adapter.getInvitationByToken(token);
    if (!invitation) throw new Error('Invitation not found');
    await adapter.updateInvitationStatus(invitation.id, 'declined');
    setInvitations((prev) => prev.filter((i) => i.token !== token));
  }, [adapter]);

  return { invitations, isLoading, error, invite, cancel, accept, decline, refresh };
}
