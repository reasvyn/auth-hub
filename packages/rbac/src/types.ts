/**
 * @reasvyn/auth-rbac — Type definitions
 *
 * Permission format: "resource:action"
 * Wildcard support: "resource:*" or "*" (full access)
 * App-scoped: "app:resource:action" (optional)
 */

/** A permission string. Convention: "resource:action" e.g. "posts:delete" */
export type Permission = string;

/**
 * A role definition with its name, permissions, and optional inheritance.
 * Roles can inherit permissions from other roles.
 */
export interface RoleDefinition {
  /** Unique role name */
  name: string;
  description?: string;
  /** Direct permissions for this role */
  permissions: Permission[];
  /**
   * Role names to inherit permissions from.
   * Inheritance is resolved recursively (cycle-safe).
   */
  inherits?: string[];
  /**
   * Mark role as a built-in preset — purely informational.
   */
  isPreset?: boolean;
}

/** Complete RBAC configuration */
export interface RBACConfig {
  roles: RoleDefinition[];
}

/** Result of a permission check */
export interface PermissionCheckResult {
  granted: boolean;
  /** Which permission was checked */
  permission: Permission;
  /** Which role was checked */
  role: string;
  /** Which inherited role granted the permission (if any) */
  grantedBy?: string;
}

/** Chainable permission checker returned by RBACEngine.can() */
export interface PermissionChecker {
  /** Check a single permission */
  do(permission: Permission): boolean;
  /** Check if any of the given permissions are granted */
  doAny(permissions: Permission[]): boolean;
  /** Check if all of the given permissions are granted */
  doAll(permissions: Permission[]): boolean;
  /** Verbose check with details */
  check(permission: Permission): PermissionCheckResult;
}
