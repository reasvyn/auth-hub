/**
 * @reasvyn/auth-team — Type definitions
 */

// ─── Team ──────────────────────────────────────────────────────────────────

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Team {
  id: string;
  name: string;
  /** URL-friendly unique identifier */
  slug: string;
  /** User ID of the team creator/owner */
  ownerId: string;
  avatarUrl?: string;
  description?: string;
  /** Arbitrary key-value metadata */
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Team Member ───────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  /** Denormalized user info (populated by adapter when available) */
  user?: TeamMemberUser;
}

export interface TeamMemberUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// ─── Invitation ────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  /** Signed token embedded in the invitation URL */
  token: string;
  /** User ID who sent the invitation */
  invitedBy: string;
  expiresAt: Date;
  status: InvitationStatus;
  createdAt: Date;
}

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface CreateTeamInput {
  name: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTeamInput {
  name?: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateInvitationInput {
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  /** Expiry in milliseconds from now. Default: 72 hours */
  expiresInMs?: number;
}

// ─── Team State (for React context) ───────────────────────────────────────

export interface TeamState {
  /** Currently active/selected team */
  currentTeam: Team | null;
  /** All teams the user belongs to */
  teams: Team[];
  /** Current user's role in `currentTeam` */
  currentRole: TeamRole | null;
  isLoading: boolean;
  error: string | null;
}
