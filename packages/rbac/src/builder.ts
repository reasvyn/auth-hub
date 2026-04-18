import { RBACEngine } from './engine';
import type { RBACConfig, RoleDefinition } from './types';

/**
 * Fluent builder for defining RBAC roles.
 *
 * @example
 * const rbac = defineRoles()
 *   .role('admin', {
 *     description: 'Full access',
 *     permissions: ['*'],
 *   })
 *   .role('editor', {
 *     description: 'Manage content',
 *     permissions: ['posts:create', 'posts:update', 'posts:read', 'media:upload'],
 *     inherits: ['viewer'],
 *   })
 *   .role('viewer', {
 *     permissions: ['posts:read', 'comments:read'],
 *   })
 *   .build();
 *
 * rbac.can('editor').do('posts:delete'); // false
 */
export class RoleBuilder {
  private readonly roles: RoleDefinition[] = [];

  role(name: string, definition: Omit<RoleDefinition, 'name'>): this {
    if (this.roles.some((r) => r.name === name)) {
      throw new Error(`[auth-rbac] Role "${name}" is already defined.`);
    }
    this.roles.push({ name, ...definition });
    return this;
  }

  /** Extend an existing role with additional permissions without redefining it. */
  extend(name: string, extra: { permissions?: string[]; inherits?: string[] }): this {
    const existing = this.roles.find((r) => r.name === name);
    if (!existing) {
      throw new Error(`[auth-rbac] Cannot extend unknown role "${name}".`);
    }
    existing.permissions = [...existing.permissions, ...(extra.permissions ?? [])];
    existing.inherits = [...(existing.inherits ?? []), ...(extra.inherits ?? [])];
    return this;
  }

  /** Return a plain RBACConfig (for serialization / inspection). */
  toConfig(): RBACConfig {
    return { roles: structuredClone(this.roles) };
  }

  /** Build and return an initialized RBACEngine. */
  build(): RBACEngine {
    return new RBACEngine(this.toConfig());
  }
}

/** Start building roles with a fluent API. */
export function defineRoles(): RoleBuilder {
  return new RoleBuilder();
}
