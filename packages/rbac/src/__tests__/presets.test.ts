import { defaultRoles, saasRoles } from '../presets';

// ─── defaultRoles ─────────────────────────────────────────────────────────────

describe('defaultRoles preset', () => {
  describe('super_admin', () => {
    it('has global wildcard access', () => {
      expect(defaultRoles.can('super_admin').do('anything:at:all')).toBe(true);
      expect(defaultRoles.can('super_admin').do('billing:delete')).toBe(true);
    });
  });

  describe('admin', () => {
    it('can manage users (wildcard)', () => {
      expect(defaultRoles.can('admin').do('users:read')).toBe(true);
      expect(defaultRoles.can('admin').do('users:delete')).toBe(true);
      expect(defaultRoles.can('admin').do('users:ban')).toBe(true);
    });

    it('can read billing but not manage it', () => {
      expect(defaultRoles.can('admin').do('billing:read')).toBe(true);
      expect(defaultRoles.can('admin').do('billing:manage')).toBe(false);
    });

    it('inherits moderator and user permissions', () => {
      expect(defaultRoles.can('admin').do('comments:read')).toBe(true);
      expect(defaultRoles.can('admin').do('profile:update')).toBe(true);
    });
  });

  describe('moderator', () => {
    it('can manage comments (wildcard)', () => {
      expect(defaultRoles.can('moderator').do('comments:delete')).toBe(true);
    });

    it('can read users but not delete them', () => {
      expect(defaultRoles.can('moderator').do('users:read')).toBe(true);
      expect(defaultRoles.can('moderator').do('users:delete')).toBe(false);
    });

    it('inherits user permissions', () => {
      expect(defaultRoles.can('moderator').do('profile:read')).toBe(true);
      expect(defaultRoles.can('moderator').do('profile:update')).toBe(true);
    });
  });

  describe('user', () => {
    it('can read and create comments', () => {
      expect(defaultRoles.can('user').do('comments:read')).toBe(true);
      expect(defaultRoles.can('user').do('comments:create')).toBe(true);
    });

    it('cannot delete comments', () => {
      expect(defaultRoles.can('user').do('comments:delete')).toBe(false);
    });

    it('cannot access users or billing', () => {
      expect(defaultRoles.can('user').do('users:read')).toBe(false);
      expect(defaultRoles.can('user').do('billing:read')).toBe(false);
    });
  });

  describe('viewer', () => {
    it('can only read content, comments, media, profile', () => {
      expect(defaultRoles.can('viewer').do('content:read')).toBe(true);
      expect(defaultRoles.can('viewer').do('comments:read')).toBe(true);
      expect(defaultRoles.can('viewer').do('profile:read')).toBe(true);
    });

    it('cannot create or modify anything', () => {
      expect(defaultRoles.can('viewer').do('content:create')).toBe(false);
      expect(defaultRoles.can('viewer').do('profile:update')).toBe(false);
    });
  });
});

// ─── saasRoles ────────────────────────────────────────────────────────────────

describe('saasRoles preset', () => {
  describe('owner', () => {
    it('has global wildcard access', () => {
      expect(saasRoles.can('owner').do('billing:manage')).toBe(true);
      expect(saasRoles.can('owner').do('team:delete')).toBe(true);
    });
  });

  describe('admin', () => {
    it('can manage team members (wildcard)', () => {
      expect(saasRoles.can('admin').do('team:members:read')).toBe(true);
      expect(saasRoles.can('admin').do('team:members:remove')).toBe(true);
    });

    it('can read billing but not manage it', () => {
      expect(saasRoles.can('admin').do('billing:read')).toBe(true);
      expect(saasRoles.can('admin').do('billing:manage')).toBe(false);
    });

    it('inherits member permissions', () => {
      expect(saasRoles.can('admin').do('profile:read')).toBe(true);
      expect(saasRoles.can('admin').do('projects:read')).toBe(true);
    });
  });

  describe('member', () => {
    it('can read and create projects', () => {
      expect(saasRoles.can('member').do('projects:read')).toBe(true);
      expect(saasRoles.can('member').do('projects:create')).toBe(true);
    });

    it('cannot manage team members beyond reading', () => {
      expect(saasRoles.can('member').do('team:members:read')).toBe(true);
      expect(saasRoles.can('member').do('team:members:remove')).toBe(false);
    });

    it('cannot access billing', () => {
      expect(saasRoles.can('member').do('billing:read')).toBe(false);
    });
  });

  describe('viewer', () => {
    it('can read team, members, projects, profile', () => {
      expect(saasRoles.can('viewer').do('team:read')).toBe(true);
      expect(saasRoles.can('viewer').do('projects:read')).toBe(true);
      expect(saasRoles.can('viewer').do('profile:read')).toBe(true);
    });

    it('cannot create or modify anything', () => {
      expect(saasRoles.can('viewer').do('projects:create')).toBe(false);
      expect(saasRoles.can('viewer').do('profile:update')).toBe(false);
    });
  });
});
