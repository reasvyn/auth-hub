# @reasvyn/auth-rbac

Role-based access control engine for Auth-TS.

## Overview

`@reasvyn/auth-rbac` provides a framework-agnostic RBAC engine plus optional React and Express bindings exposed through subpath exports.

Use the root package for permission modeling and evaluation, then compose:

- `@reasvyn/auth-rbac/react` for React UI access control
- `@reasvyn/auth-rbac/middleware` for Express authorization middleware

## Key Features

- Built-in role presets such as `defaultRoles` and `saasRoles`
- Fluent role builder with `defineRoles()`
- React provider and `<Can>` component
- Express middleware for permission-based route protection
- Wildcard permission matching
- Role inheritance with cycle-safe resolution
- Permission cache for repeated checks

## Minimum Requirements

### Runtime Requirements

- TypeScript-aware environment
- React >= 18.0.0 for `/react`
- Express >= 4.0.0 for `/middleware`

### Tech Stack

- TypeScript 5.x
- Zero runtime dependencies in the core RBAC engine
- Optional React and Express integrations via peer dependencies

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-rbac
```

### 2. Define Roles

```ts
import { defineRoles } from '@reasvyn/auth-rbac';

const rbac = defineRoles()
  .role('viewer', { permissions: ['posts:read'] })
  .role('editor', { permissions: ['posts:write'], extends: ['viewer'] })
  .role('admin', { permissions: ['users:manage'], extends: ['editor'] })
  .build();
```

### 3. Check Permissions

```ts
rbac.can('editor').do('posts:write'); // true
rbac.can('viewer').do('posts:write'); // false
rbac.can('admin').doAny(['posts:write', 'billing:manage']); // true
```

### 4. Use React or Express Bindings

```tsx
import { RBACProvider, Can } from '@reasvyn/auth-rbac/react';

<RBACProvider engine={rbac} role="admin">
  <Can permission="users:manage">
    <button>Manage users</button>
  </Can>
</RBACProvider>;
```

```ts
import { requirePermission } from '@reasvyn/auth-rbac/middleware';

app.delete('/api/posts/:id', requirePermission({ rbac, permission: 'posts:delete' }), handler);
```

## Technical Reference

### Root Exports

- `RBACEngine`
- `defineRoles`
- `RoleBuilder`
- `defaultRoles`
- `saasRoles`

### Core Permission Model

Permissions follow the `resource:action` convention:

- `posts:read`
- `posts:*`
- `*`

### `RBACEngine`

Typical evaluation methods:

- `can(role).do(permission)`
- `can(role).doAny(permissions)`
- `can(role).doAll(permissions)`
- `can(role).check(permission)`

### React Subpath: `@reasvyn/auth-rbac/react`

Exports:

- `RBACProvider`
- `Can`
- `usePermissions`
- `RBACContext`

### Express Subpath: `@reasvyn/auth-rbac/middleware`

Exports:

- `requirePermission(options)`
- `requireAnyPermission(options)`
- `requireAllPermissions(options)`

All middleware helpers accept an initialized `RBACEngine` plus optional custom role extraction and forbidden handlers.

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md) when changing permission semantics, middleware behavior, or React bindings.

## Security

Authorization mistakes are security-sensitive. Report concerns through the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
