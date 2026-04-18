import type {
  RBACConfig,
  RoleDefinition,
  Permission,
  PermissionCheckResult,
  PermissionChecker,
} from './types';

/**
 * Checks whether a permission string matches a target.
 * Supports single wildcards: "resource:*" matches "resource:read", "resource:delete", etc.
 * Supports global wildcard: "*" matches everything.
 */
function matchPermission(granted: Permission, target: Permission): boolean {
  if (granted === '*') return true;
  if (granted === target) return true;

  const grantedParts = granted.split(':');
  const targetParts = target.split(':');

  if (grantedParts.length !== targetParts.length) return false;

  return grantedParts.every((part, i) => part === '*' || part === targetParts[i]);
}

/**
 * Core RBAC engine. Instantiate once and share across your app.
 *
 * @example
 * const rbac = new RBACEngine({
 *   roles: [
 *     { name: 'admin', permissions: ['*'] },
 *     { name: 'editor', permissions: ['posts:create', 'posts:update', 'posts:read'], inherits: ['viewer'] },
 *     { name: 'viewer', permissions: ['posts:read', 'comments:read'] },
 *   ],
 * });
 *
 * rbac.can('editor').do('posts:delete'); // false
 * rbac.can('admin').do('posts:delete');  // true
 */
export class RBACEngine {
  private readonly roleMap: Map<string, RoleDefinition>;
  /** Resolved (flattened) permission cache per role */
  private readonly cache: Map<string, Set<Permission>> = new Map();

  constructor(private readonly config: RBACConfig) {
    this.roleMap = new Map(config.roles.map((r) => [r.name, r]));
    // Pre-warm cache
    for (const role of config.roles) {
      this.resolvePermissions(role.name, new Set());
    }
  }

  /** Resolve all permissions for a role (including inherited), cycle-safe. */
  private resolvePermissions(roleName: string, visiting: Set<string>): Set<Permission> {
    const cached = this.cache.get(roleName);
    if (cached) return cached;

    if (visiting.has(roleName)) {
      // Cycle detected — stop recursion
      return new Set();
    }

    const role = this.roleMap.get(roleName);
    if (!role) return new Set();

    visiting.add(roleName);

    const perms = new Set<Permission>(role.permissions);

    for (const parentName of role.inherits ?? []) {
      for (const perm of this.resolvePermissions(parentName, new Set(visiting))) {
        perms.add(perm);
      }
    }

    visiting.delete(roleName);
    this.cache.set(roleName, perms);
    return perms;
  }

  /** Get all resolved permissions for a role (including inherited). */
  getPermissions(roleName: string): Permission[] {
    return Array.from(this.resolvePermissions(roleName, new Set()));
  }

  /** Get all role definitions. */
  getRoles(): RoleDefinition[] {
    return this.config.roles;
  }

  /** Get a single role definition by name. */
  getRole(roleName: string): RoleDefinition | undefined {
    return this.roleMap.get(roleName);
  }

  /** Low-level: check if a role has a specific permission. */
  hasPermission(roleName: string, permission: Permission): boolean {
    const perms = this.resolvePermissions(roleName, new Set());
    for (const granted of perms) {
      if (matchPermission(granted, permission)) return true;
    }
    return false;
  }

  /** Check if a role has at least one of the given permissions. */
  hasAnyPermission(roleName: string, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(roleName, p));
  }

  /** Check if a role has all of the given permissions. */
  hasAllPermissions(roleName: string, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(roleName, p));
  }

  /** Verbose check — returns which role granted the permission. */
  checkPermission(roleName: string, permission: Permission): PermissionCheckResult {
    const role = this.roleMap.get(roleName);
    if (!role) {
      return { granted: false, permission, role: roleName };
    }

    // Check direct permissions first
    for (const granted of role.permissions) {
      if (matchPermission(granted, permission)) {
        return { granted: true, permission, role: roleName, grantedBy: roleName };
      }
    }

    // Check inherited
    for (const parentName of role.inherits ?? []) {
      const result = this.checkPermission(parentName, permission);
      if (result.granted) {
        return { granted: true, permission, role: roleName, grantedBy: result.grantedBy };
      }
    }

    return { granted: false, permission, role: roleName };
  }

  /**
   * Fluent permission checker.
   *
   * @example
   * rbac.can('editor').do('posts:update')    // boolean
   * rbac.can('admin').doAll(['users:read', 'users:delete'])
   * rbac.can('viewer').check('posts:delete') // PermissionCheckResult
   */
  can(roleName: string): PermissionChecker {
    return {
      do: (permission) => this.hasPermission(roleName, permission),
      doAny: (permissions) => this.hasAnyPermission(roleName, permissions),
      doAll: (permissions) => this.hasAllPermissions(roleName, permissions),
      check: (permission) => this.checkPermission(roleName, permission),
    };
  }
}
