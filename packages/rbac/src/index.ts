/**
 * @reasvyn/auth-rbac
 *
 * Role-Based Access Control engine for Auth-TS.
 * Framework-agnostic core — React and Express bindings in separate exports.
 */

export { RBACEngine } from './engine';
export { defineRoles, RoleBuilder } from './builder';
export { defaultRoles, saasRoles } from './presets';
export type {
  Permission,
  RoleDefinition,
  RBACConfig,
  PermissionCheckResult,
  PermissionChecker,
} from './types';
