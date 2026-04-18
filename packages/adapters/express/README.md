# @reasvyn/auth-express

Express middleware and ready-to-mount auth router for Auth-TS.

## Overview

`@reasvyn/auth-express` provides the Express integration layer for Auth-TS. It exposes middleware for authentication and role checks, plus `createAuthRouter()` for common auth flows such as register, login, refresh, magic link, email verification, password reset, authenticated one-time-code challenges, recovery code regeneration, and security method enrollment flows.

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
  createAuthRouter({
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    hmacSecret: process.env.HMAC_SECRET!,
    appBaseUrl: 'https://myapp.com',
    services: {
      findUserById: (id) => db.users.findUnique({ where: { id } }),
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
      storeOneTimeCodeChallenge: (challenge) =>
        db.oneTimeCodeChallenges.create({ data: challenge }),
      findOneTimeCodeChallenge: (id) => db.oneTimeCodeChallenges.findUnique({ where: { id } }),
      updateOneTimeCodeChallenge: (id, data) =>
        db.oneTimeCodeChallenges.update({ where: { id }, data }),
      createSecurityEvent: (event) => db.securityEvents.create({ data: event }),
      listSecurityEvents: (userId, params) =>
        db.securityEvents
          .findMany({
            where: {
              userId,
              ...(params?.types ? { type: { in: params.types } } : {}),
            },
            orderBy: { timestamp: 'desc' },
            take: params?.limit,
          })
          .then((items) => ({ items })),
      sendOneTimeCode: async ({ destination, code }) => {
        await mailer.sendOtp({ to: destination, code });
      },
      findPasswordCredential: (userId) => db.passwordCredentials.findUnique({ where: { userId } }),
      listUserSecurityMethods: (userId) =>
        db.securityMethods.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      findUserSecurityMethodById: (userId, methodId) =>
        db.securityMethods.findFirst({ where: { id: methodId, userId } }),
      createUserSecurityMethod: (method) => db.securityMethods.create({ data: method }),
      updateUserSecurityMethod: (methodId, data) =>
        db.securityMethods.update({ where: { id: methodId }, data }),
      listRecoveryCodes: (userId) => db.recoveryCodes.findMany({ where: { userId } }),
      replaceRecoveryCodes: async (userId, codes) => {
        await db.recoveryCodes.deleteMany({ where: { userId } });
        await db.recoveryCodes.createMany({ data: codes });
      },
      updateRecoveryCode: (recoveryCodeId, data) =>
        db.recoveryCodes.update({ where: { id: recoveryCodeId }, data }),
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

- `findUserById(userId)`
- `findUserByEmail(email)`
- `createUser(data)`
- `updateUser(userId, data)`
- `storeRefreshToken(userId, token, expiresAt)`
- `validateRefreshToken(token)`
- `revokeRefreshToken(token)`
- `storeOneTimeCodeChallenge(challenge)`
- `findOneTimeCodeChallenge(challengeId)`
- `updateOneTimeCodeChallenge(challengeId, data)`
- `createSecurityEvent(event)`
- `listSecurityEvents(userId, params?)`
- `sendOneTimeCode({ user, destination, code, challenge })`
- `findPasswordCredential(userId)`
- `listUserSecurityMethods(userId)`
- `findUserSecurityMethodById(userId, methodId)`
- `createUserSecurityMethod(method)`
- `updateUserSecurityMethod(methodId, data)`
- `listRecoveryCodes(userId)`
- `replaceRecoveryCodes(userId, codes)`
- `updateRecoveryCode(recoveryCodeId, data)`

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

### Security Routes

When mounted at the application root, `createAuthRouter()` exposes both auth endpoints and authenticated security-management endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /users/me/security`
- `GET /users/me/security/methods`
- `POST /users/me/security/methods`
- `POST /users/me/security/methods/:methodId/verify`
- `POST /users/me/security/methods/:methodId/disable`
- `POST /users/me/security/challenges`
- `POST /users/me/security/challenges/verify`
- `POST /users/me/security/recovery-codes`
- `GET /users/me/security/events`

### Security Notes

- access tokens are short-lived
- refresh tokens are rotated
- magic link and password reset flows avoid obvious email enumeration behavior
- auth responses are sanitized before sending user objects back to clients
- OTP challenges are stored as hashes, expire automatically, decrement attempts on failure, and become single-use after success or exhaustion
- security method enrollment is challenge-bound and cannot be completed with an unrelated OTP
- recovery codes are regenerated as hashed-at-rest records and can authorize high-risk method disable flows

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../../CONTRIBUTING.md) when changing middleware behavior, route contracts, or response payloads.

## Security

This package directly handles auth boundaries. Report vulnerabilities through the root [SECURITY.md](../../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
