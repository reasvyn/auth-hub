# @reasvyn/auth-types

Shared TypeScript contracts for the Auth-TS ecosystem.

## Overview

`@reasvyn/auth-types` is the common type layer used by the other packages in this monorepo. It provides the canonical shapes for users, auth flows, sessions, tokens, OAuth payloads, API envelopes, and security-related data.

Use this package when you want your application code, adapters, SDK integration, or custom persistence layer to share the same contracts as the rest of Auth-TS.

## Key Features

- Shared contracts for `User`, `AuthResponse`, `ActiveSession`, and `JWTPayload`
- Type-safe request and response models for auth flows
- Shared API error and response envelope types
- Centralized auth-related TypeScript types
- Security-oriented types for MFA, rate limiting, CSRF, and audit-style metadata

## Minimum Requirements

### Runtime Requirements

- TypeScript-aware environment
- Node.js >= 18.0.0 when used inside this monorepo

### Tech Stack

- TypeScript 5.x
- ESM/CJS-compatible package exports
- Distributed declaration files via `dist/*.d.ts`

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-types
```

### 2. Import Core Contracts

```ts
import type {
  User,
  RegisterCredentials,
  AuthResponse,
  ActiveSession,
  JWTPayload,
  ErrorCode,
} from '@reasvyn/auth-types';
```

### 3. Use the Types in Your Own Integration Layer

```ts
import type { RegisterCredentials, User } from '@reasvyn/auth-types';

export interface UserRepository {
  createUser(input: RegisterCredentials): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
}
```

## Technical Reference

### Exported Type Groups

The package re-exports all definitions from:

- `user`
- `auth`
- `session`
- `token`
- `oauth`
- `error`
- `api`
- `security`

### Commonly Used Types

| Type | Purpose |
|------|---------|
| `User` | Canonical user record with `profile?` and `settings?` |
| `RegisterCredentials` | Registration input including `displayName?`, `firstName?`, `lastName?`, `confirmPassword?`, `acceptTerms?` |
| `AuthResponse` | Auth result shape with `user?`, `session?`, `requiresMfa?`, `mfaToken?`, `error?` |
| `AuthSession` | Session payload carrying `accessToken`, optional `refreshToken`, `expiresAt`, and `tokenType` |
| `ActiveSession` | Lightweight active-session view for UI and API responses |
| `JWTPayload` | JWT claim shape used by adapters and middleware |
| `AuthError` | Serialized error payload structure, not the runtime `Error` class from `@reasvyn/auth-core` |

### User Model Notes

The canonical `User` shape is intentionally nested:

```ts
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'banned' | 'pending_verification';
  profile?: UserProfile;
  settings?: UserSettings;
}
```

This means integrations should prefer `user.profile?.displayName` instead of older flat fields like `name`.

### Session Model Notes

For session UIs and list endpoints, the current lightweight contract is `ActiveSession[]`, not the older full `Session[]` pattern for every screen.

## License

MIT

## Contributing

Please follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md) when changing public type contracts, especially if they affect multiple packages.

## Security

If a type change affects authentication, authorization, or session safety, report concerns through the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
