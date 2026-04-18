# Auth-TS

A modular TypeScript authentication monorepo for building reusable auth foundations, UI layers, SDKs, and framework adapters.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-EF4444.svg)](https://turbo.build/)

## Overview

Auth-TS is designed as a package-first authentication toolkit. Instead of shipping one tightly coupled app, this repository provides modular packages that can be used independently or combined depending on your stack.

The monorepo currently covers shared types, auth core utilities, React UI, a Node.js SDK, Express and Next.js adapters, RBAC, team management primitives, and a built-in credential auth foundation for password credentials, one-time-code challenges, recovery codes, and user security methods. The repository is library-first and does not currently include a tracked production app or docs site.

### Available Packages

| Package                                                | Description                                             | Version |
| ------------------------------------------------------ | ------------------------------------------------------- | ------- |
| [`@reasvyn/auth-types`](./packages/types)              | Shared TypeScript type definitions                      | 0.1.0   |
| [`@reasvyn/auth-core`](./packages/core)                | Framework-agnostic authentication primitives            | 0.1.0   |
| [`@reasvyn/auth-react`](./packages/react)              | React components, hooks, and auth context               | 0.1.0   |
| [`@reasvyn/auth-node-sdk`](./packages/node-sdk)        | Fetch-based SDK for auth-compatible APIs                | 0.1.0   |
| [`@reasvyn/auth-express`](./packages/adapters/express) | Express middleware and ready-to-mount auth router       | 0.1.0   |
| [`@reasvyn/auth-nextjs`](./packages/adapters/nextjs)   | Next.js client, server, and Edge auth helpers           | 0.1.0   |
| [`@reasvyn/auth-rbac`](./packages/rbac)                | Role-based access control engine and bindings           | 0.1.0   |
| [`@reasvyn/auth-team`](./packages/team)                | Team, invitation, and multi-tenant collaboration module | 0.1.0   |

### Repository Layout

```text
auth-ts/
├── packages/
│   ├── types/
│   ├── core/
│   ├── react/
│   ├── node-sdk/
│   ├── rbac/
│   ├── team/
│   └── adapters/
│       ├── express/
│       └── nextjs/
├── package.json
├── turbo.json
└── tsconfig.json
```

## Key Features

- React auth components and hooks with TailwindCSS-friendly styling
- Next.js Edge middleware, server helpers, and client adapter
- Express middleware and plug-and-play auth routes
- Node.js SDK built on native `fetch`
- Email/password authentication with bcrypt-based hashing
- Credential auth foundation for password credentials, OTP challenges, recovery codes, and user security methods
- Magic link and email verification utilities
- JWT access and refresh token flows
- MFA/TOTP setup and verification support
- Team and invitation management for multi-tenant applications
- RBAC engine with inheritance, presets, and React/Express bindings
- Modular auth packages under the `@reasvyn/*` scope
- Strict shared TypeScript contracts across packages

## Minimum Requirements

### Runtime Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

### Tech Stack

- **Language:** TypeScript 5.x
- **Package manager:** npm workspaces
- **Monorepo runner:** Turborepo
- **Linting:** ESLint
- **Formatting:** Prettier
- **Testing:** Jest + ts-jest
- **Backend auth primitives:** bcryptjs, jsonwebtoken, zod, speakeasy, qrcode, uuid
- **Frontend UI layer:** React 18+
- **Styling for UI packages:** TailwindCSS 3+
- **Supported framework adapters:** Express 4+ and Next.js 13+

### Development Commands

The primary repository validation entrypoints are:

```bash
npm run lint
npm run format:check
npm run type-check
npm run test
npm run build
```

To format supported source and documentation files across the repository, run:

```bash
npm run format
```

## Quick Start

### 1. Install Dependencies

For local development of this monorepo:

```bash
git clone https://github.com/reasvyn/auth-ts.git
cd auth-ts
npm install
```

If you only want to consume specific packages in another application, install only the modules you need.

```bash
# Shared types
npm install @reasvyn/auth-types

# Core auth utilities
npm install @reasvyn/auth-core

# React UI layer
npm install @reasvyn/auth-react

# Node.js SDK
npm install @reasvyn/auth-node-sdk

# Express adapter
npm install @reasvyn/auth-express express

# Next.js adapter
npm install @reasvyn/auth-nextjs @reasvyn/auth-react

# RBAC
npm install @reasvyn/auth-rbac

# Team module
npm install @reasvyn/auth-team
```

### 2. Use the Packages

#### Option A: Next.js App Router

Create Edge protection:

```ts
import { createAuthMiddleware } from '@reasvyn/auth-nextjs/middleware';

export const middleware = createAuthMiddleware({
  secret: process.env.JWT_ACCESS_SECRET!,
  loginPath: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

Wrap your app with the React provider:

```tsx
'use client';

import { AuthProvider } from '@reasvyn/auth-react';
import { createNextJsAdapter } from '@reasvyn/auth-nextjs/client';

const adapter = createNextJsAdapter({ basePath: '/api/auth' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider adapter={adapter}>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

Read the authenticated session in a Server Component:

```tsx
import { headers } from 'next/headers';
import { getServerSession } from '@reasvyn/auth-nextjs';

export default async function DashboardPage() {
  const session = getServerSession(await headers());

  if (!session) {
    return null;
  }

  return <h1>Hello, {session.email}</h1>;
}
```

#### Option B: Express Backend

Mount the router at the application root so it can expose both `/auth/*` and `/users/me/security/*` endpoints:

```ts
import express from 'express';
import { createAuthRouter, requireAuth, requireRole } from '@reasvyn/auth-express';

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
        const stored = await db.refreshTokens.findUnique({ where: { token } });
        if (!stored || stored.expiresAt < new Date()) return null;
        return stored.userId;
      },
      revokeRefreshToken: (token) => db.refreshTokens.delete({ where: { token } }),
      storeOneTimeCodeChallenge: (challenge) =>
        db.oneTimeCodeChallenges.create({ data: challenge }),
      findOneTimeCodeChallenge: (id) => db.oneTimeCodeChallenges.findUnique({ where: { id } }),
      updateOneTimeCodeChallenge: (id, data) =>
        db.oneTimeCodeChallenges.update({ where: { id }, data }),
      createSecurityEvent: (event) => db.securityEvents.create({ data: event }),
      sendOneTimeCode: async ({ destination, code }) => {
        await mailer.sendOtp({ to: destination, code });
      },
    },
  }),
);

const auth = requireAuth({ secret: process.env.JWT_ACCESS_SECRET! });

app.get('/api/me', auth, (req, res) => {
  res.json({ userId: req.auth!.sub, email: req.auth!.email });
});

app.delete('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  await db.users.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

#### Option C: React Client with a Custom Adapter

```tsx
import { AuthProvider, LoginForm } from '@reasvyn/auth-react';
import { AuthClient } from '@reasvyn/auth-node-sdk';

const client = new AuthClient({ baseUrl: 'https://myapp.com' });

const adapter = {
  login: (credentials) => client.auth.login(credentials),
  register: (credentials) => client.auth.register(credentials),
  logout: (refreshToken) => client.auth.logout(refreshToken),
  refreshToken: (refreshToken) => client.auth.refreshToken(refreshToken),
  getUser: () => client.users.me(),
  sendMagicLink: (email) => client.auth.sendMagicLink(email),
  requestPasswordReset: (email) => client.auth.requestPasswordReset(email),
  confirmPasswordReset: (token, newPassword) =>
    client.auth.confirmPasswordReset(token, newPassword),
  changePassword: (currentPassword, newPassword) =>
    client.auth.changePassword(currentPassword, newPassword),
};

export function App() {
  return (
    <AuthProvider adapter={adapter}>
      <LoginForm providers={['google', 'github']} enableMagicLink />
    </AuthProvider>
  );
}
```

### 3. Validate the Repository

After making changes locally, run:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request so your changes stay aligned with the repository workflow and package conventions.

All contributors are also expected to follow the repository [Code of Conduct](./CODE-OF-CONDUCT.md).

## Security

If you discover a security issue, need to report a vulnerability, or need security-related support, please contact:

- **Email:** [reasvyn@gmail.com](mailto:reasvyn@gmail.com)

Please avoid opening public issues for undisclosed security vulnerabilities. For the full reporting process and disclosure expectations, see [SECURITY.md](./SECURITY.md).

## License

MIT © [Reas Vyn](https://github.com/reasvyn)
