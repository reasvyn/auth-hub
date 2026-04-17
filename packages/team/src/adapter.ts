import type {
  Team,
  TeamMember,
  TeamInvitation,
  TeamRole,
  CreateTeamInput,
  UpdateTeamInput,
  CreateInvitationInput,
  InvitationStatus,
} from './types';

/**
 * TeamAdapter — pluggable persistence interface.
 * Implement this to connect @reasvyn/auth-team to any database/ORM.
 *
 * @example
 * // Prisma implementation example:
 * const adapter: TeamAdapter = {
 *   createTeam: (data) => prisma.team.create({ data }),
 *   getTeam: (id) => prisma.team.findUnique({ where: { id } }),
 *   // ...
 * };
 */
export interface TeamAdapter {
  // ─── Teams ──────────────────────────────────────────────────────────

  createTeam(data: CreateTeamInput & { ownerId: string }): Promise<Team>;
  getTeam(teamId: string): Promise<Team | null>;
  getTeamBySlug(slug: string): Promise<Team | null>;
  updateTeam(teamId: string, data: UpdateTeamInput): Promise<Team>;
  deleteTeam(teamId: string): Promise<void>;

  /** List all teams a user belongs to (as member or owner) */
  listUserTeams(userId: string): Promise<Team[]>;

  // ─── Members ────────────────────────────────────────────────────────

  addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMember>;
  removeMember(teamId: string, userId: string): Promise<void>;
  updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMember>;
  listMembers(teamId: string): Promise<TeamMember[]>;
  getMember(teamId: string, userId: string): Promise<TeamMember | null>;

  // ─── Invitations ────────────────────────────────────────────────────

  createInvitation(data: CreateInvitationInput & { token: string }): Promise<TeamInvitation>;
  getInvitationByToken(token: string): Promise<TeamInvitation | null>;
  getInvitationById(invitationId: string): Promise<TeamInvitation | null>;
  updateInvitationStatus(invitationId: string, status: InvitationStatus): Promise<void>;
  listInvitations(teamId: string, status?: InvitationStatus): Promise<TeamInvitation[]>;

  // ─── Optional ───────────────────────────────────────────────────────

  /** Called when an invitation is sent — implement email delivery */
  sendInvitationEmail?(invitation: TeamInvitation, team: Team, inviteUrl: string): Promise<void>;
}
