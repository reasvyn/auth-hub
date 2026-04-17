import type { TeamRole, TeamInvitation } from './types';

// ─── Slug ──────────────────────────────────────────────────────────────────

/**
 * Convert a team name to a URL-safe slug.
 * e.g. "My Awesome Team!" → "my-awesome-team"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Invitation token ──────────────────────────────────────────────────────

const TOKEN_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a cryptographically random invitation token.
 * Uses crypto.getRandomValues when available (browsers + Node 18+), falls back to Math.random.
 */
export function generateInviteToken(length = 48): string {
  const chars = TOKEN_CHARSET;
  let result = '';

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      result += chars[byte % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

// ─── Invitation helpers ────────────────────────────────────────────────────

/** Check if an invitation has expired. */
export function isInvitationExpired(invitation: TeamInvitation): boolean {
  return new Date() > invitation.expiresAt;
}

/** Check if an invitation can still be acted on (pending and not expired). */
export function isInvitationActionable(invitation: TeamInvitation): boolean {
  return invitation.status === 'pending' && !isInvitationExpired(invitation);
}

/** Compute expiry Date from now + ms offset. */
export function computeExpiresAt(expiresInMs = 72 * 60 * 60 * 1000): Date {
  return new Date(Date.now() + expiresInMs);
}

// ─── Role helpers ──────────────────────────────────────────────────────────

const ROLE_RANK: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/** Returns true if `actorRole` outranks `targetRole`. */
export function outranks(actorRole: TeamRole, targetRole: TeamRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

/** Returns true if `actorRole` is at least as privileged as `requiredRole`. */
export function atLeast(actorRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_RANK[actorRole] >= ROLE_RANK[requiredRole];
}

/** All roles in descending order of privilege. */
export const TEAM_ROLES: TeamRole[] = ['owner', 'admin', 'member', 'viewer'];

/** Human-readable labels for team roles. */
export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

// ─── Permission checks ─────────────────────────────────────────────────────

/**
 * Determine if an actor can invite someone with a given role.
 * Rules: owners can invite anyone; admins can invite members and viewers; members cannot invite.
 */
export function canInviteWithRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') return targetRole === 'member' || targetRole === 'viewer';
  return false;
}

/**
 * Determine if an actor can change a member's role.
 * Actor must outrank both the current member role and the new role.
 */
export function canChangeRole(
  actorRole: TeamRole,
  currentRole: TeamRole,
  newRole: TeamRole,
): boolean {
  if (actorRole === 'owner') return currentRole !== 'owner'; // cannot demote another owner
  return outranks(actorRole, currentRole) && outranks(actorRole, newRole);
}

/**
 * Determine if an actor can remove a member.
 * Only owners and admins can remove members; owners cannot remove other owners.
 */
export function canRemoveMember(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (actorRole === 'owner') return targetRole !== 'owner';
  if (actorRole === 'admin') return outranks('admin', targetRole); // admin > member, viewer
  return false; // member and viewer cannot remove anyone
}
