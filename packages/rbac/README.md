# @reasvyn/auth-rbac

> Role-Based Access Control (RBAC) engine for auth-hub — pure TypeScript, zero runtime dependencies.

## Features

- ✅ Fluent role builder (`defineRoles()`)
- ✅ Wildcard permissions (`"*"`, `"resource:*"`)
- ✅ Recursive role inheritance with cycle detection
- ✅ Pre-computed permission cache for O(1) checks
- ✅ React `<Can>` component + `usePermissions()` hook
- ✅ Express middleware (`requirePermission`)
- ✅ Ready-made presets for common SaaS patterns

## Installation

```bash
pnpm add @reasvyn/auth-rbac
```

## Quick Start

```ts
import { defineRoles } from '@reasvyn/auth-rbac';

const engine = defineRoles()
  .role('viewer',  { permissions: ['posts:read', 'comments:read'] })
  .role('editor',  { permissions: ['posts:write', 'posts:delete'], extends: ['viewer'] })
  .role('admin',   { permissions: ['users:manage'], extends: ['editor'] })
  .role('owner',   { permissions: ['*'] })
  .build();

engine.can('editor').do('posts:write');   // true
engine.can('viewer').do('posts:delete'); // false
engine.can('owner').do('anything:ever'); // true — wildcard
```

## API Reference

### `defineRoles()`

Returns a `RoleBuilder` fluent instance.

```ts
const engine = defineRoles()
  .role(name, definition)   // add a new role
  .extend(name, extra)      // extend an existing role (merge permissions/extends)
  .build();                 // returns RBACEngine
```

#### `RoleDefinition`

```ts
interface RoleDefinition {
  /** Permission strings in "resource:action" format.
   *  Use "*" for global admin, "resource:*" for all actions on a resource. */
  permissions: string[];
  /** Other role names this role inherits from */
  extends?: string[];
}
```

### `RBACEngine`

```ts
engine.can(role: string).do(permission: string): boolean
engine.can(role: string).doAny(permissions: string[]): boolean
engine.can(role: string).doAll(permissions: string[]): boolean
engine.can(role: string).check(permission: string): PermissionCheckResult

interface PermissionCheckResult {
  granted: boolean;
  role: string;
  permission: string;
  /** Which inherited role granted the permission, if any */
  grantedBy?: string;
}
```

### Presets

```ts
import { defaultRoles, saasRoles } from '@reasvyn/auth-rbac';

// defaultRoles: super_admin, admin, moderator, user, viewer
defaultRoles.can('admin').do('users:manage'); // true

// saasRoles: owner, admin, member, viewer
saasRoles.can('owner').do('billing:manage'); // true
```

## React Integration

### `<RBACProvider>`

Wrap your app (after `AuthProvider`):

```tsx
import { RBACProvider, saasRoles } from '@reasvyn/auth-rbac/react';
import { useAuth } from '@reasvyn/auth-react';

function App() {
  const { user } = useAuth();
  return (
    <RBACProvider engine={saasRoles} role={user?.role ?? 'viewer'}>
      {children}
    </RBACProvider>
  );
}
```

### `usePermissions()`

```tsx
import { usePermissions } from '@reasvyn/auth-rbac/react';

function DeleteButton() {
  const { can, canAny } = usePermissions();

  if (!can('posts:delete')) return null;
  return <button>Delete</button>;
}
```

### `<Can>`

```tsx
import { Can } from '@reasvyn/auth-rbac/react';

// Single permission
<Can permission="posts:write">
  <button>Edit</button>
</Can>

// Any of these permissions
<Can anyOf={['posts:write', 'posts:delete']} fallback={<p>No access</p>}>
  <ManagePost />
</Can>

// All permissions required
<Can allOf={['billing:read', 'billing:manage']}>
  <BillingPanel />
</Can>
```

#### `<Can>` Props

| Prop | Type | Description |
|---|---|---|
| `permission` | `string` | Single permission to check |
| `anyOf` | `string[]` | At least one must be granted |
| `allOf` | `string[]` | All must be granted |
| `fallback` | `ReactNode` | Render when access is denied |

## Express Middleware

```ts
import { requirePermission, requireAnyPermission } from '@reasvyn/auth-rbac/middleware';

// Reads req.auth.role — populated by @reasvyn/auth-express requireAuth()
router.delete('/posts/:id',
  requireAuth(),                          // sets req.auth.role
  requirePermission(engine, 'posts:delete'),
  deletePostHandler,
);

router.get('/admin',
  requireAuth(),
  requireAnyPermission(engine, ['admin:read', 'super_admin:read']),
  adminHandler,
);
```

### Available middleware

| Function | Description |
|---|---|
| `requirePermission(engine, perm)` | User must have this permission |
| `requireAnyPermission(engine, perms)` | User must have at least one |
| `requireAllPermissions(engine, perms)` | User must have all |

## Permission Format

Permissions follow the `"resource:action"` convention:

| Pattern | Matches |
|---|---|
| `"posts:read"` | Exact: read posts |
| `"posts:*"` | All actions on posts |
| `"*"` | Everything (super admin) |

## Composing with auth-team

```ts
// Use team-scoped roles with RBAC
const { currentRole } = useTeam();      // 'admin' | 'member' | ...
const { can } = usePermissions();       // reads role from RBACProvider

// In RBACProvider, supply currentRole from useTeam():
<RBACProvider engine={saasRoles} role={currentRole ?? 'viewer'}>
```
