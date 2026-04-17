import { defineRoles } from './builder';

/**
 * Default role presets — ready to use or extend.
 *
 * Permissions follow the "resource:action" convention.
 *
 * @example
 * import { defaultRoles } from '@reasvyn/auth-rbac';
 *
 * defaultRoles.can('admin').do('users:delete');   // true
 * defaultRoles.can('moderator').do('billing:*');  // false
 * defaultRoles.can('user').do('profile:update');  // true
 */
export const defaultRoles = defineRoles()
  .role('super_admin', {
    description: 'Unrestricted access to everything',
    permissions: ['*'],
    isPreset: true,
  })
  .role('admin', {
    description: 'Full user & content management, read billing',
    permissions: [
      'users:*',
      'content:*',
      'media:*',
      'settings:read',
      'settings:update',
      'billing:read',
      'audit:read',
    ],
    inherits: ['moderator'],
    isPreset: true,
  })
  .role('moderator', {
    description: 'Manage content and read users',
    permissions: [
      'content:read',
      'content:create',
      'content:update',
      'content:delete',
      'comments:*',
      'users:read',
      'media:upload',
      'media:read',
    ],
    inherits: ['user'],
    isPreset: true,
  })
  .role('user', {
    description: 'Standard authenticated user',
    permissions: [
      'profile:read',
      'profile:update',
      'content:read',
      'comments:read',
      'comments:create',
      'media:read',
    ],
    isPreset: true,
  })
  .role('viewer', {
    description: 'Read-only access',
    permissions: ['content:read', 'comments:read', 'media:read', 'profile:read'],
    isPreset: true,
  })
  .build();

/**
 * SaaS-oriented presets with team & billing scoping.
 * Suitable for multi-tenant applications.
 */
export const saasRoles = defineRoles()
  .role('owner', {
    description: 'Organization/team owner — full access including billing and deletion',
    permissions: ['*'],
    isPreset: true,
  })
  .role('admin', {
    description: 'Team admin — manage members and settings, no billing',
    permissions: [
      'team:read',
      'team:update',
      'team:members:*',
      'team:invites:*',
      'projects:*',
      'billing:read',
      'settings:*',
    ],
    inherits: ['member'],
    isPreset: true,
  })
  .role('member', {
    description: 'Standard team member',
    permissions: [
      'team:read',
      'team:members:read',
      'projects:read',
      'projects:create',
      'projects:update',
      'profile:read',
      'profile:update',
    ],
    isPreset: true,
  })
  .role('viewer', {
    description: 'Read-only team member',
    permissions: ['team:read', 'team:members:read', 'projects:read', 'profile:read'],
    isPreset: true,
  })
  .build();
