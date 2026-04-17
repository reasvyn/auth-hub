# Auth-TS

A TypeScript authentication monorepo for reusable auth packages: core primitives, UI, SDKs, and framework adapters. The repository is currently library-first; there is no checked-in app or docs site in this tree today.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-EF4444.svg)](https://turbo.build/)

## Overview

Auth-Hub provides everything you need to add authentication to your applications:

- 🔐 **Email/Password authentication** with secure hashing (bcrypt)
- 🌐 **OAuth2 support** for Google, GitHub, Discord, Facebook, Microsoft, Twitter
- 🔗 **Magic link** passwordless authentication
- 🛡️ **MFA/TOTP** — setup, verify, disable, backup codes
- ⚛️ **React components & hooks** — drop-in LoginForm, RegisterForm, MFA flows, dark mode
- 📦 **Node.js HTTP SDK** for server-side integration
- 🚂 **Express adapter** — middleware + plug-and-play route handlers
- ▲ **Next.js adapter** — Edge middleware, Server Component helpers, client adapter
- 🎨 **TailwindCSS** with full light/dark mode support
- 🔒 **RBAC** — role-based access control engine, `<Can>` component, Express middleware
- 👥 **Team management** — multi-tenant workspaces, invitations, role hierarchy, ready-made React UI
- 🔧 **Fully TypeScript** — strict types throughout, zero `any` in public API

## Architecture

```
auth-ts/
├── packages/
│   ├── types/         # Shared TypeScript type definitions   (@reasvyn/auth-types)
│   ├── core/          # Core auth logic — framework-agnostic (@reasvyn/auth-core)
│   ├── react/         # React components & hooks             (@reasvyn/auth-react)
│   ├── node-sdk/      # HTTP client SDK                      (@reasvyn/auth-node-sdk)
│   ├── rbac/          # Role-Based Access Control engine     (@reasvyn/auth-rbac)
│   ├── team/          # Team management & invitations        (@reasvyn/auth-team)
│   └── adapters/
│       ├── express/   # Express.js middleware & router       (@reasvyn/auth-express)
│       └── nextjs/    # Next.js App Router + Edge support    (@reasvyn/auth-nextjs)
├── apps/
│   └── docs/          # Documentation site
├── turbo.json
├── tsconfig.json
├── turbo.json
├── tsconfig.json
└── package.json
```

## Repository Status

- **Package manager:** npm
- **Workspace runner:** Turborepo
- **Repository shape:** packages only; no `apps/` directory is currently tracked
- **Primary validation entrypoints:** `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@reasvyn/auth-types`](./packages/types) | Shared TypeScript type definitions | 0.1.0 |
| [`@reasvyn/auth-core`](./packages/core) | Core authentication logic (framework-agnostic) | 0.1.0 |
| [`@reasvyn/auth-react`](./packages/react) | React components & hooks (Tailwind, dark mode) | 0.1.0 |
| [`@reasvyn/auth-node-sdk`](./packages/node-sdk) | HTTP client SDK | 0.1.0 |
| [`@reasvyn/auth-express`](./packages/adapters/express) | Express.js middleware & route handlers | 0.1.0 |
| [`@reasvyn/auth-nextjs`](./packages/adapters/nextjs) | Next.js App Router, Edge Middleware & server helpers | 0.1.0 |
| [`@reasvyn/auth-rbac`](./packages/rbac) | Role-Based Access Control engine, `<Can>` component, Express middleware | 0.1.0 |
| [`@reasvyn/auth-team`](./packages/team) | Team management, invitations, role hierarchy, React UI | 0.1.0 |

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Install a Package

```bash
# Types package
npm install @reasvyn/auth-types

# Core auth logic (Node.js/server-side)
npm install @reasvyn/auth-core

# React components and hooks
npm install @reasvyn/auth-react

# Node.js SDK
npm install @reasvyn/auth-node-sdk
```

## Quick Start

### Next.js App Router (Recommended)

The fastest way to add auth to a Next.js 13+ project.

**1. Install packages**

```bash
npm install @reasvyn/auth-nextjs @reasvyn/auth-react
# tailwindcss must already be set up in your project
```

**2. Add Edge Middleware** (`middleware.ts` at project root)

```ts
import { createAuthMiddleware } from '@reasvyn/auth-nextjs/middleware';

export const middleware = createAuthMiddleware({
  secret: process.env.JWT_SECRET!,
  loginPath: '/login',
});

// Protect dashboard and all API routes under /api/protected
export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

**3. Wrap your layout with `AuthProvider`** (`app/layout.tsx`)

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

**4. Drop in a LoginForm** (`app/login/page.tsx`)

```tsx
'use client';
import { LoginForm } from '@reasvyn/auth-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoginForm
        providers={['google', 'github']}
        enableMagicLink
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}
```

**5. Read session in Server Components**

```tsx
import { headers } from 'next/headers';
import { getServerSession } from '@reasvyn/auth-nextjs';

export default async function DashboardPage() {
  const session = await getServerSession(await headers());
  if (!session) return null;
  return <h1>Hello, {session.email}</h1>;
}
```

---

### React + Express (Custom Backend)

**1. Install packages**

```bash
# Frontend
npm install @reasvyn/auth-react

# Backend
npm install @reasvyn/auth-express @reasvyn/auth-core
```

**2. Mount the auth router** (Express server)

```ts
import express from 'express';
import { createAuthRouter } from '@reasvyn/auth-express';

const app = express();
app.use(express.json());

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
    revokeRefreshToken: (token) =>
      db.refreshTokens.delete({ where: { token } }),
  },
}));
```

**3. Protect routes with middleware**

```ts
import { requireAuth, requireRole } from '@reasvyn/auth-express';

const auth = requireAuth({ secret: process.env.JWT_ACCESS_SECRET! });

app.get('/api/me', auth, (req, res) => {
  res.json({ userId: req.auth!.sub });
});

app.delete('/api/users/:id', auth, requireRole('admin'), (req, res) => {
  // Only admins reach here
});
```

**4. Connect React frontend with an adapter**

```tsx
import { AuthProvider, LoginForm } from '@reasvyn/auth-react';
import { AuthHubClient } from '@reasvyn/auth-node-sdk';

// Create SDK client that points to your Express server
const client = new AuthHubClient({ baseUrl: 'https://myapp.com' });

// Build an adapter from the SDK client
const adapter = {
  login: (creds) => client.auth.login(creds),
  register: (creds) => client.auth.register(creds),
  logout: (rt) => client.auth.logout(rt),
  refreshToken: (rt) => client.auth.refreshToken(rt),
  getUser: () => client.users.me(),
  sendMagicLink: (email) => client.auth.sendMagicLink(email),
  requestPasswordReset: (email) => client.auth.requestPasswordReset(email),
  confirmPasswordReset: (token, pw) => client.auth.confirmPasswordReset(token, pw),
  changePassword: (cur, next) => client.auth.changePassword(cur, next),
};

function App() {
  return (
    <AuthProvider adapter={adapter}>
      <LoginForm providers={['google', 'github']} enableMagicLink />
    </AuthProvider>
  );
}
```

---

### Node.js SDK (Standalone)

```typescript
import { AuthHubClient } from '@reasvyn/auth-node-sdk';

const client = new AuthHubClient({ baseUrl: 'https://auth.myapp.com' });

// Login and set token for subsequent requests
const session = await client.auth.login({ email: 'user@example.com', password: 'secret' });
client.setAccessToken(session.accessToken!);

// Fetch current user
const me = await client.users.me();

// List active sessions
const sessions = await client.sessions.list();

// Set up MFA
const mfaData = await client.mfa.setup('totp');
console.log(mfaData.qrCodeUrl); // Show QR to user
```

---

### Core Package (Low-level / Server-side)

```typescript
import { hashPassword, verifyPassword, createJWT, verifyJWT, createTokenPair } from '@reasvyn/auth-core';

const hash = await hashPassword('mypassword');
const valid = await verifyPassword('mypassword', hash); // true

// Short-lived access token + long-lived refresh token
const { accessToken, refreshToken } = createTokenPair(
  { sub: user.id, email: user.email, role: user.role },
  process.env.JWT_ACCESS_SECRET!,
  process.env.JWT_REFRESH_SECRET!,
);
```

## Development

### Setup

```bash
git clone https://github.com/reasvyn/auth-ts.git
cd auth-ts
npm install
npm run lint
npm run type-check
npm run test
npm run build
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all packages |
| `npm run dev` | Start development mode |
| `npm run lint` | Lint all packages |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run all tests |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean all build outputs |

### Release Workflow

This repo uses **per-package semver** under npm workspaces.

1. Update the target package version in its `package.json`.
2. Update package README/root docs when the public API or usage changes.
3. Run the usual root validation commands.
4. Merge the version bump to the branch you release from.
5. Trigger the manual GitHub Actions workflow **Publish Package** and pass the workspace package name, for example `@reasvyn/auth-core`.

The workflow definition lives in [`.github/workflows/release-package.yml`](./.github/workflows/release-package.yml) and publishes a single workspace package using the checked-in version.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap

- [ ] Hosted SaaS dashboard with centralized user management
- [ ] Passkey/WebAuthn support
- [ ] SMS-based OTP
- [ ] Audit log & anomaly detection
- [ ] Admin SDK
- [ ] First-party docs or example app in-repo
- [ ] Package API stabilization and publishing automation
- [ ] Svelte / Vue adapters

## License

MIT © [Reas Vyn](https://github.com/reasvyn)
