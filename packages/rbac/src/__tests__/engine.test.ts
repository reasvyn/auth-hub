import { RBACEngine } from '../engine';
import type { RBACConfig } from '../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const config: RBACConfig = {
  roles: [
    { name: 'super_admin', permissions: ['*'] },
    { name: 'admin', permissions: ['users:*', 'content:*', 'billing:read'], inherits: ['moderator'] },
    { name: 'moderator', permissions: ['content:read', 'content:update', 'comments:*'], inherits: ['user'] },
    { name: 'user', permissions: ['profile:read', 'profile:update', 'content:read', 'comments:read', 'comments:create'] },
    { name: 'viewer', permissions: ['content:read', 'profile:read'] },
  ],
};

let engine: RBACEngine;

beforeEach(() => {
  engine = new RBACEngine(config);
});

// ─── matchPermission (via hasPermission) ─────────────────────────────────────

describe('Permission matching', () => {
  it('matches exact permission strings', () => {
    expect(engine.hasPermission('user', 'profile:read')).toBe(true);
  });

  it('denies a permission not in the role', () => {
    expect(engine.hasPermission('viewer', 'profile:update')).toBe(false);
  });

  it('global wildcard "*" grants everything', () => {
    expect(engine.hasPermission('super_admin', 'anything:at:all')).toBe(true);
    expect(engine.hasPermission('super_admin', 'users:delete')).toBe(true);
    expect(engine.hasPermission('super_admin', 'billing:manage')).toBe(true);
  });

  it('resource wildcard "resource:*" grants all actions on that resource', () => {
    expect(engine.hasPermission('admin', 'users:read')).toBe(true);
    expect(engine.hasPermission('admin', 'users:delete')).toBe(true);
    expect(engine.hasPermission('admin', 'users:ban')).toBe(true);
  });

  it('resource wildcard does NOT grant other resources', () => {
    expect(engine.hasPermission('admin', 'billing:delete')).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(engine.hasPermission('ghost', 'content:read')).toBe(false);
  });
});

// ─── Inheritance ─────────────────────────────────────────────────────────────

describe('Role inheritance', () => {
  it('resolves permissions from parent roles', () => {
    // moderator inherits from user
    expect(engine.hasPermission('moderator', 'profile:read')).toBe(true);
    expect(engine.hasPermission('moderator', 'profile:update')).toBe(true);
  });

  it('resolves permissions transitively (grandparent)', () => {
    // admin → moderator → user
    expect(engine.hasPermission('admin', 'profile:read')).toBe(true);
    expect(engine.hasPermission('admin', 'profile:update')).toBe(true);
  });

  it('does NOT grant child permissions to parent', () => {
    // user does NOT inherit admin/moderator perms
    expect(engine.hasPermission('user', 'content:update')).toBe(false);
    expect(engine.hasPermission('user', 'users:read')).toBe(false);
  });

  it('handles cycle detection gracefully — no crash, own perms preserved', () => {
    // Build a config with a cycle: a → b → a
    // Resolution order: 'a' first → a resolves b → b tries to resolve a (cycle!) → breaks
    // Result: a gets both perms; b only gets its own (cycle broken at b→a)
    const cycleEngine = new RBACEngine({
      roles: [
        { name: 'a', permissions: ['x:read'], inherits: ['b'] },
        { name: 'b', permissions: ['y:read'], inherits: ['a'] },
      ],
    });
    // Both roles have their own direct permissions
    expect(cycleEngine.hasPermission('a', 'x:read')).toBe(true);
    expect(cycleEngine.hasPermission('b', 'y:read')).toBe(true);
    // 'a' (resolved first) inherits y:read from b before cycle is detected
    expect(cycleEngine.hasPermission('a', 'y:read')).toBe(true);
    // 'b' (already cached when a resolves) does NOT get x:read — cycle is broken here
    expect(cycleEngine.hasPermission('b', 'x:read')).toBe(false);
  });
});

// ─── hasAnyPermission / hasAllPermissions ────────────────────────────────────

describe('hasAnyPermission', () => {
  it('returns true when at least one permission is granted', () => {
    expect(engine.hasAnyPermission('viewer', ['content:read', 'content:delete'])).toBe(true);
  });

  it('returns false when none of the permissions are granted', () => {
    expect(engine.hasAnyPermission('viewer', ['users:delete', 'billing:manage'])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(engine.hasAnyPermission('super_admin', [])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when all permissions are granted', () => {
    expect(engine.hasAllPermissions('admin', ['users:read', 'billing:read', 'content:read'])).toBe(true);
  });

  it('returns false when any permission is missing', () => {
    expect(engine.hasAllPermissions('viewer', ['content:read', 'profile:update'])).toBe(false);
  });

  it('returns true for empty array', () => {
    expect(engine.hasAllPermissions('viewer', [])).toBe(true);
  });
});

// ─── checkPermission (verbose) ───────────────────────────────────────────────

describe('checkPermission', () => {
  it('returns granted:true with grantedBy for direct permission', () => {
    const result = engine.checkPermission('user', 'profile:read');
    expect(result).toMatchObject({ granted: true, permission: 'profile:read', role: 'user', grantedBy: 'user' });
  });

  it('returns grantedBy the ancestor when inherited', () => {
    const result = engine.checkPermission('admin', 'profile:read');
    expect(result.granted).toBe(true);
    // profile:read comes from 'user' eventually
    expect(result.grantedBy).toBe('user');
  });

  it('returns granted:false for denied permission', () => {
    const result = engine.checkPermission('viewer', 'users:delete');
    expect(result).toMatchObject({ granted: false, permission: 'users:delete', role: 'viewer' });
    expect(result.grantedBy).toBeUndefined();
  });

  it('returns granted:false for unknown role', () => {
    const result = engine.checkPermission('ghost', 'content:read');
    expect(result.granted).toBe(false);
  });
});

// ─── Fluent can() API ────────────────────────────────────────────────────────

describe('can() fluent API', () => {
  it('.do() delegates to hasPermission', () => {
    expect(engine.can('user').do('profile:update')).toBe(true);
    expect(engine.can('viewer').do('profile:update')).toBe(false);
  });

  it('.doAny() delegates to hasAnyPermission', () => {
    expect(engine.can('viewer').doAny(['content:read', 'billing:delete'])).toBe(true);
    expect(engine.can('viewer').doAny(['billing:delete'])).toBe(false);
  });

  it('.doAll() delegates to hasAllPermissions', () => {
    expect(engine.can('admin').doAll(['users:read', 'content:read', 'billing:read'])).toBe(true);
    expect(engine.can('moderator').doAll(['users:delete', 'content:read'])).toBe(false);
  });

  it('.check() delegates to checkPermission', () => {
    const result = engine.can('moderator').check('content:update');
    expect(result.granted).toBe(true);
    expect(result.grantedBy).toBe('moderator');
  });
});

// ─── getPermissions / getRoles / getRole ─────────────────────────────────────

describe('Introspection', () => {
  it('getPermissions returns all resolved permissions including inherited', () => {
    const perms = engine.getPermissions('moderator');
    expect(perms).toContain('content:read');
    expect(perms).toContain('comments:*');
    // inherited from user
    expect(perms).toContain('profile:read');
    expect(perms).toContain('profile:update');
  });

  it('getRoles returns all role definitions', () => {
    const roles = engine.getRoles();
    expect(roles.map((r) => r.name)).toEqual(['super_admin', 'admin', 'moderator', 'user', 'viewer']);
  });

  it('getRole returns the definition for a known role', () => {
    const role = engine.getRole('viewer');
    expect(role).toBeDefined();
    expect(role!.name).toBe('viewer');
    expect(role!.permissions).toContain('content:read');
  });

  it('getRole returns undefined for unknown role', () => {
    expect(engine.getRole('ghost')).toBeUndefined();
  });
});
