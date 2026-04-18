# @reasvyn/auth-express

Express middleware and ready-to-mount auth router for Auth-TS.

## Overview

`@reasvyn/auth-express` provides the Express integration layer for Auth-TS. It exposes middleware for authentication and role checks, plus `createAuthRouter()` for common auth flows such as register, login, refresh, magic link, email verification, and password reset.

The package is service-driven: you provide the persistence and delivery functions, and the adapter handles routing, validation, token issuance, and JSON response envelopes.

## Key Features

- `createAuthRouter()` with ready-made auth endpoints
- `requireAuth()` middleware for JWT-protected routes
- `requireRole()` middleware for role-gated routes
- `optionalAuth()` middleware for mixed public/private endpoints
- Typed `req.auth` augmentation for downstream handlers
- Shared validation and error handling through `@reasvyn/auth-core`
- Response hardening for auth payloads

## Minimum Requirements

### Runtime Requirements

- Node.js >= 18.0.0
- Express >= 4.0.0

### Tech Stack

- TypeScript 5.x
- Express middleware and router composition
- JWT and auth primitives from `@reasvyn/auth-core`
- Shared contracts from `@reasvyn/auth-types`

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-express express @reasvyn/auth-core
```

### 2. Mount the Auth Router

```ts
import express from 'express';
import { createAuthRouter } from '@reasvyn/auth-express';

const app = express();
app.use(express.json());

app.use(
  '/auth',
  createAuthRouter({
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    hmacSecret: process.env.HMAC_SECRET!,
    appBaseUrl: 'https://myapp.com',
    services: {
      findUserByEmail: (email) => db.users.findUnique({ where: { email } }),
      createUser: (data) => db.users.create({ data }),
      updateUser: (id, data) => db.users.update({ where: { id }, data }),
      storeRefreshToken: (userId, token, expiresAt) =>
        db.refreshTokens.create({ data: { userId, token, expiresAt } }),
      validateRefreshToken: async (token) => {
        const tokenRow = await db.refreshTokens.findUnique({ where: { token } });
        if (!tokenRow || tokenRow.expiresAt < new Date()) return null;
        return tokenRow.userId;
      },
      revokeRefreshToken: (token) => db.refreshTokens.delete({ where: { token } }),
    },
  }),
);
```

### 3. Protect Routes

```ts
import { requireAuth, requireRole } from '@reasvyn/auth-express';

const auth = requireAuth({ secret: process.env.JWT_ACCESS_SECRET! });

app.get('/api/me', auth, (req, res) => {
  res.json({ userId: req.auth!.sub, email: req.auth!.email });
});

app.delete('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  await db.users.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

## Technical Reference

### Root Exports

- `requireAuth`
- `optionalAuth`
- `requireRole`
- `createAuthRouter`

### `AuthMiddlewareOptions`

```ts
interface AuthMiddlewareOptions {
  secret: string;
  tokenSource?: 'header' | 'cookie';
  cookieName?: string;
  onUnauthorized?: (req, res, error) => void;
}
```

### `req.auth`

This package augments `Express.Request` with:

```ts
req.auth?: JWTPayload & { token: string };
```

### `AuthRouterServices`

Required responsibilities:

- `findUserByEmail(email)`
- `createUser(data)`
- `updateUser(userId, data)`
- `storeRefreshToken(userId, token, expiresAt)`
- `validateRefreshToken(token)`
- `revokeRefreshToken(token)`

Optional:

- `sendEmailVerification(user, token, url)`
- `sendMagicLink(email, token, url)`
- `sendPasswordResetEmail(user, token, url)`

### Response Envelope

Successful routes return:

```json
{ "success": true, "data": { ... } }
```

Errors return:

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

### Security Notes

- access tokens are short-lived
- refresh tokens are rotated
- magic link and password reset flows avoid obvious email enumeration behavior
- auth responses are sanitized before sending user objects back to clients

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../../CONTRIBUTING.md) when changing middleware behavior, route contracts, or response payloads.

## Security

This package directly handles auth boundaries. Report vulnerabilities through the root [SECURITY.md](../../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
