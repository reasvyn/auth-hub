import {
  slugify,
  generateInviteToken,
  isInvitationExpired,
  isInvitationActionable,
  computeExpiresAt,
  outranks,
  atLeast,
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  canInviteWithRole,
  canChangeRole,
  canRemoveMember,
} from '../utils';
import type { TeamInvitation, TeamRole } from '../types';

// ─── Helper to build a mock invitation ───────────────────────────────────────

function mockInvitation(overrides: Partial<TeamInvitation> = {}): TeamInvitation {
  return {
    id: 'inv_1',
    teamId: 'team_1',
    email: 'test@example.com',
    role: 'member',
    token: 'tok_abc',
    invitedBy: 'user_1',
    status: 'pending',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h from now
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('slugify()', () => {
  it('lowercases the input', () => {
    expect(slugify('HELLO WORLD')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my awesome team')).toBe('my-awesome-team');
  });

  it('removes special characters', () => {
    expect(slugify('My Team!')).toBe('my-team');
    expect(slugify('Acme Corp.')).toBe('acme-corp');
  });

  it('collapses multiple spaces/underscores into one hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
    expect(slugify('-hello-')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles already-slug strings', () => {
    expect(slugify('my-team')).toBe('my-team');
  });

  it('handles unicode by stripping non-word chars', () => {
    // Non-ASCII letters that are not \w are stripped
    expect(slugify('café')).toBe('caf');
  });
});

// ─── generateInviteToken ─────────────────────────────────────────────────────

describe('generateInviteToken()', () => {
  it('generates a 48-character token by default', () => {
    expect(generateInviteToken()).toHaveLength(48);
  });

  it('generates a token of custom length', () => {
    expect(generateInviteToken(16)).toHaveLength(16);
    expect(generateInviteToken(64)).toHaveLength(64);
  });

  it('only contains alphanumeric characters', () => {
    const token = generateInviteToken(100);
    expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateInviteToken()));
    expect(tokens.size).toBe(20);
  });
});

// ─── computeExpiresAt ────────────────────────────────────────────────────────

describe('computeExpiresAt()', () => {
  it('returns a Date in the future', () => {
    const expiresAt = computeExpiresAt();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('defaults to 72 hours from now', () => {
    const before = Date.now();
    const expiresAt = computeExpiresAt();
    const after = Date.now();
    const expectedMs = 72 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + expectedMs);
  });

  it('respects a custom duration', () => {
    const oneHourMs = 60 * 60 * 1000;
    const before = Date.now();
    const expiresAt = computeExpiresAt(oneHourMs);
    const after = Date.now();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + oneHourMs);
  });
});

// ─── isInvitationExpired ─────────────────────────────────────────────────────

describe('isInvitationExpired()', () => {
  it('returns false when the invitation has not expired', () => {
    const inv = mockInvitation({ expiresAt: new Date(Date.now() + 1000) });
    expect(isInvitationExpired(inv)).toBe(false);
  });

  it('returns true when the invitation has expired', () => {
    const inv = mockInvitation({ expiresAt: new Date(Date.now() - 1000) });
    expect(isInvitationExpired(inv)).toBe(true);
  });
});

// ─── isInvitationActionable ──────────────────────────────────────────────────

describe('isInvitationActionable()', () => {
  it('returns true for a pending, non-expired invitation', () => {
    const inv = mockInvitation({ status: 'pending', expiresAt: new Date(Date.now() + 1000) });
    expect(isInvitationActionable(inv)).toBe(true);
  });

  it('returns false for an expired invitation even if status is pending', () => {
    const inv = mockInvitation({ status: 'pending', expiresAt: new Date(Date.now() - 1) });
    expect(isInvitationActionable(inv)).toBe(false);
  });

  it.each(['accepted', 'declined', 'cancelled', 'expired'] as const)(
    'returns false for status "%s"',
    (status) => {
      const inv = mockInvitation({ status, expiresAt: new Date(Date.now() + 1000) });
      expect(isInvitationActionable(inv)).toBe(false);
    },
  );
});

// ─── TEAM_ROLES / TEAM_ROLE_LABELS ───────────────────────────────────────────

describe('TEAM_ROLES constant', () => {
  it('includes all four roles', () => {
    expect(TEAM_ROLES).toEqual(expect.arrayContaining(['owner', 'admin', 'member', 'viewer']));
    expect(TEAM_ROLES).toHaveLength(4);
  });

  it('is ordered descending by privilege', () => {
    expect(TEAM_ROLES[0]).toBe('owner');
    expect(TEAM_ROLES[TEAM_ROLES.length - 1]).toBe('viewer');
  });
});

describe('TEAM_ROLE_LABELS constant', () => {
  it('has a label for every role', () => {
    for (const role of TEAM_ROLES) {
      expect(typeof TEAM_ROLE_LABELS[role]).toBe('string');
      expect(TEAM_ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });
});

// ─── outranks ────────────────────────────────────────────────────────────────

describe('outranks()', () => {
  const cases: [TeamRole, TeamRole, boolean][] = [
    ['owner', 'admin', true],
    ['owner', 'member', true],
    ['owner', 'viewer', true],
    ['admin', 'member', true],
    ['admin', 'viewer', true],
    ['member', 'viewer', true],
    ['admin', 'owner', false],
    ['member', 'admin', false],
    ['viewer', 'member', false],
    ['owner', 'owner', false], // equal, not outranking
    ['member', 'member', false],
  ];

  it.each(cases)('%s outranks %s → %s', (actor, target, expected) => {
    expect(outranks(actor, target)).toBe(expected);
  });
});

// ─── atLeast ─────────────────────────────────────────────────────────────────

describe('atLeast()', () => {
  const cases: [TeamRole, TeamRole, boolean][] = [
    ['owner', 'owner', true],
    ['owner', 'admin', true],
    ['admin', 'admin', true],
    ['admin', 'member', true],
    ['member', 'member', true],
    ['viewer', 'viewer', true],
    ['viewer', 'member', false],
    ['member', 'admin', false],
    ['admin', 'owner', false],
  ];

  it.each(cases)('atLeast(%s, %s) → %s', (actor, required, expected) => {
    expect(atLeast(actor, required)).toBe(expected);
  });
});

// ─── canInviteWithRole ───────────────────────────────────────────────────────

describe('canInviteWithRole()', () => {
  it('owner can invite any role', () => {
    for (const role of TEAM_ROLES) {
      expect(canInviteWithRole('owner', role)).toBe(true);
    }
  });

  it('admin can invite member and viewer', () => {
    expect(canInviteWithRole('admin', 'member')).toBe(true);
    expect(canInviteWithRole('admin', 'viewer')).toBe(true);
  });

  it('admin cannot invite owner or another admin', () => {
    expect(canInviteWithRole('admin', 'owner')).toBe(false);
    expect(canInviteWithRole('admin', 'admin')).toBe(false);
  });

  it('member cannot invite anyone', () => {
    for (const role of TEAM_ROLES) {
      expect(canInviteWithRole('member', role)).toBe(false);
    }
  });

  it('viewer cannot invite anyone', () => {
    for (const role of TEAM_ROLES) {
      expect(canInviteWithRole('viewer', role)).toBe(false);
    }
  });
});

// ─── canChangeRole ───────────────────────────────────────────────────────────

describe('canChangeRole()', () => {
  it('owner can change any non-owner to any non-owner role', () => {
    expect(canChangeRole('owner', 'admin', 'member')).toBe(true);
    expect(canChangeRole('owner', 'member', 'admin')).toBe(true);
    expect(canChangeRole('owner', 'viewer', 'member')).toBe(true);
  });

  it('owner cannot change another owner', () => {
    expect(canChangeRole('owner', 'owner', 'admin')).toBe(false);
  });

  it('admin can change member to viewer and vice versa', () => {
    expect(canChangeRole('admin', 'member', 'viewer')).toBe(true);
    expect(canChangeRole('admin', 'viewer', 'member')).toBe(true);
  });

  it('admin cannot promote to admin or owner', () => {
    expect(canChangeRole('admin', 'member', 'admin')).toBe(false);
    expect(canChangeRole('admin', 'member', 'owner')).toBe(false);
  });

  it('admin cannot demote another admin', () => {
    expect(canChangeRole('admin', 'admin', 'member')).toBe(false);
  });

  it('member cannot change any role', () => {
    expect(canChangeRole('member', 'viewer', 'member')).toBe(false);
    expect(canChangeRole('member', 'member', 'viewer')).toBe(false);
  });
});

// ─── canRemoveMember ─────────────────────────────────────────────────────────

describe('canRemoveMember()', () => {
  it('owner can remove admin, member, viewer', () => {
    expect(canRemoveMember('owner', 'admin')).toBe(true);
    expect(canRemoveMember('owner', 'member')).toBe(true);
    expect(canRemoveMember('owner', 'viewer')).toBe(true);
  });

  it('owner cannot remove another owner', () => {
    expect(canRemoveMember('owner', 'owner')).toBe(false);
  });

  it('admin can remove member and viewer', () => {
    expect(canRemoveMember('admin', 'member')).toBe(true);
    expect(canRemoveMember('admin', 'viewer')).toBe(true);
  });

  it('admin cannot remove owner or another admin', () => {
    expect(canRemoveMember('admin', 'owner')).toBe(false);
    expect(canRemoveMember('admin', 'admin')).toBe(false);
  });

  it('member cannot remove anyone', () => {
    for (const role of TEAM_ROLES) {
      expect(canRemoveMember('member', role)).toBe(false);
    }
  });

  it('viewer cannot remove anyone', () => {
    for (const role of TEAM_ROLES) {
      expect(canRemoveMember('viewer', role)).toBe(false);
    }
  });
});
