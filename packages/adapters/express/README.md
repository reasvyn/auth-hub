# @reasvyn/auth-express

Express.js middleware and ready-to-mount auth route handlers for auth-hub. Provides:

- **`requireAuth`** — JWT middleware that protects routes
- **`optionalAuth`** — Attaches auth info if present, never blocks
- **`requireRole`** — Role-based access control, used after `requireAuth`
- **`createAuthRouter`** — Complete auth Express Router (register, login, logout, refresh, email verification, magic links, password reset/change)

## Installation

```bash
npm install @reasvyn/auth-express
# peer dependencies
npm install express @reasvyn/auth-core
```

## Quick Start

```typescript
import express from 'express';
import { createAuthRouter, requireAuth, requireRole } from '@reasvyn/auth-express';

const app = express();
app.use(express.json());

// Mount the full auth flow at /auth
app.use('/auth', createAuthRouter({
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
      const rt = await db.refreshTokens.findUnique({ where: { token } });
      if (!rt || rt.expiresAt < new Date()) return null;
      return rt.userId;
    },
    revokeRefreshToken: (token) => db.refreshTokens.delete({ where: { token } }),
    // Optional — wire up your email provider
    sendEmailVerification: async (user, _token, url) => {
      await mailer.send({ to: user.email, subject: 'Verify your email', body: `Click: ${url}` });
    },
    sendMagicLink: async (email, _token, url) => {
      await mailer.send({ to: email, subject: 'Your magic link', body: `Click: ${url}` });
    },
    sendPasswordResetEmail: async (user, _token, url) => {
      await mailer.send({ to: user.email, subject: 'Reset your password', body: `Click: ${url}` });
    },
  },
}));

// Protect your API routes
const auth = requireAuth({ secret: process.env.JWT_ACCESS_SECRET! });

app.get('/api/me', auth, (req, res) => {
  res.json({ userId: req.auth!.sub, email: req.auth!.email });
});

app.delete('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  await db.users.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

---

## Auth Routes

When you mount `createAuthRouter(config)` at a path (e.g. `/auth`), these routes become available:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account + issue tokens |
| `POST` | `/auth/login` | Email/password login |
| `POST` | `/auth/logout` | Revoke refresh token |
| `POST` | `/auth/refresh` | Rotate access + refresh tokens |
| `POST` | `/auth/email/send-verification` | Trigger verification email |
| `POST` | `/auth/email/verify` | Confirm email with token |
| `POST` | `/auth/magic-link` | Send magic link email |
| `POST` | `/auth/magic-link/verify` | Verify magic link, issue tokens |
| `POST` | `/auth/password/reset` | Send password reset email |
| `POST` | `/auth/password/reset/confirm` | Confirm reset with new password |

### Response envelope

All routes respond with a consistent JSON envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```

### Auth response (register / login / magic-link / refresh)

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "user", ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  }
}
```

---

## Middleware

### `requireAuth(options)`

Protects a route — returns `401` if the token is missing or invalid.

Attaches `req.auth: JWTPayload & { token: string }` for downstream handlers.

```typescript
import { requireAuth } from '@reasvyn/auth-express';

const auth = requireAuth({
  secret: process.env.JWT_ACCESS_SECRET!,
  tokenSource: 'header',   // 'header' (default) | 'cookie'
  cookieName: 'access_token', // Only used when tokenSource is 'cookie'
  onUnauthorized: (req, res, message) => {
    // Custom 401 response
    res.status(401).json({ error: message });
  },
});

app.get('/api/profile', auth, (req, res) => {
  // req.auth is guaranteed to exist here
  res.json({ sub: req.auth!.sub, role: req.auth!.role });
});
```

#### `AuthMiddlewareOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `secret` | `string` | — | **Required.** JWT access token secret |
| `tokenSource` | `'header' \| 'cookie'` | `'header'` | Where to read the token |
| `cookieName` | `string` | `'access_token'` | Cookie name (when `tokenSource: 'cookie'`) |
| `onUnauthorized` | `(req, res, message) => void` | — | Custom 401 handler |

### `optionalAuth(options)`

Same as `requireAuth` but never returns `401`. Useful for routes that return different data for authenticated vs. anonymous users.

```typescript
import { optionalAuth } from '@reasvyn/auth-express';

app.get('/api/posts', optionalAuth({ secret: process.env.JWT_ACCESS_SECRET! }), (req, res) => {
  if (req.auth) {
    // Return personalized posts
  } else {
    // Return public posts
  }
});
```

### `requireRole(...roles)`

Role-based access control. **Must be placed after `requireAuth`**.

```typescript
import { requireAuth, requireRole } from '@reasvyn/auth-express';

const auth = requireAuth({ secret: process.env.JWT_ACCESS_SECRET! });

// Only admin or moderator
app.delete('/api/posts/:id', auth, requireRole('admin', 'moderator'), handler);
```

Returns `403 Forbidden` with `{ "error": { "code": "FORBIDDEN" } }` for unauthorized roles.

### TypeScript — `req.auth` type

The package extends `Express.Request` via declaration merging, so `req.auth` is typed automatically:

```typescript
import type { JWTPayload } from '@reasvyn/auth-types';
// req.auth is: (JWTPayload & { token: string }) | undefined
```

---

## `createAuthRouter(config)`

### `AuthRouterConfig`

| Property | Type | Description |
|----------|------|-------------|
| `jwtAccessSecret` | `string` | Secret for signing access tokens |
| `jwtRefreshSecret` | `string` | Secret for signing refresh tokens |
| `hmacSecret` | `string` | HMAC secret for email verification & magic link tokens |
| `appBaseUrl` | `string` | Base URL used when building links in emails (e.g. `'https://myapp.com'`) |
| `services` | `AuthRouterServices` | Pluggable persistence layer |

### `AuthRouterServices`

You implement this interface to wire the router to your database of choice.

```typescript
interface AuthRouterServices {
  // Required — core persistence
  findUserByEmail(email: string): Promise<User | null>;
  createUser(data: { email: string; name?: string; passwordHash: string }): Promise<User>;
  updateUser(userId: string, data: Partial<User & { passwordHash: string }>): Promise<User>;
  storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  validateRefreshToken(token: string): Promise<string | null>;  // returns userId or null
  revokeRefreshToken(token: string): Promise<void>;

  // Optional — email delivery (you choose the provider)
  sendEmailVerification?(user: User, token: string, url: string): Promise<void>;
  sendMagicLink?(email: string, token: string, url: string): Promise<void>;
  sendPasswordResetEmail?(user: User, token: string, url: string): Promise<void>;
}
```

**Note:** Email sending failures are non-fatal — the route still responds with `200` so your users aren't blocked if the mail provider is down.

---

## Security Notes

- Access tokens are short-lived (default: 15 minutes via `AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY_SECONDS`).
- Refresh tokens are rotated on every use — the old token is revoked, a new one is issued.
- Magic link / password reset tokens expire after 1 hour.
- Password reset and magic link endpoints always return `200` regardless of whether the email exists (prevents email enumeration attacks).
- Passwords are hashed with bcrypt (from `@reasvyn/auth-core`).

---

## Environment Variables

```env
JWT_ACCESS_SECRET=at-least-32-chars-random-string
JWT_REFRESH_SECRET=different-at-least-32-chars-random-string
HMAC_SECRET=another-secret-for-email-tokens
```

> Use different secrets for access tokens, refresh tokens, and HMAC. Generate with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
