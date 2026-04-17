# Auth-Hub

A comprehensive TypeScript authentication library monorepo — modular, reusable, and framework-agnostic. Built for freelance projects, internal tools, and multi-app authentication. The foundation for a future hosted auth SaaS with centralized user management and monitoring.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-EF4444.svg)](https://turbo.build/)

## Overview

Auth-Hub provides everything you need to add authentication to your applications:

- 🔐 **Email/Password authentication** with secure hashing
- 🌐 **OAuth2 support** for Google, GitHub, and more
- 🔗 **Magic link** authentication
- 🛡️ **Security features**: rate limiting, CSRF protection, brute-force prevention, 2FA/TOTP
- ⚛️ **React components & hooks** — drop-in LoginForm, RegisterForm, MFA flows
- 📦 **Node.js SDK** for server-side integration
- 🎨 **TailwindCSS & shadcn/ui** compatible styling
- 🔧 **Fully TypeScript** — strict types throughout

## Architecture

```
auth-hub/
├── packages/
│   ├── types/        # Shared TypeScript type definitions
│   ├── core/         # Core auth logic (framework-agnostic)
│   ├── react/        # React components & hooks
│   └── node-sdk/     # Node.js SDK client
├── apps/
│   └── docs/         # Documentation site
├── turbo.json
├── tsconfig.json
└── package.json
```

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@reasvyn/auth-types`](./packages/types) | Shared TypeScript type definitions | 0.0.1 |
| [`@reasvyn/auth-core`](./packages/core) | Core authentication logic | 0.0.1 |
| [`@reasvyn/auth-react`](./packages/react) | React components & hooks | 0.0.1 |
| [`@reasvyn/auth-node-sdk`](./packages/node-sdk) | Node.js SDK client | 0.0.1 |

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

### React Application

```tsx
import { AuthProvider, LoginForm } from '@reasvyn/auth-react';
import { AuthHubClient } from '@reasvyn/auth-node-sdk';

const client = new AuthHubClient({
  baseUrl: 'https://your-auth-server.com',
  clientId: 'your-client-id',
});

function App() {
  return (
    <AuthProvider client={client}>
      <LoginForm
        onSuccess={(session) => console.log('Logged in!', session)}
        onError={(error) => console.error('Auth error:', error)}
        providers={['google', 'github']}
      />
    </AuthProvider>
  );
}
```

### Node.js SDK

```typescript
import { AuthHubClient } from '@reasvyn/auth-node-sdk';

const client = new AuthHubClient({
  baseUrl: 'https://your-auth-server.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Login
const session = await client.auth.login({
  email: 'user@example.com',
  password: 'secure-password',
});

// Get current user
const user = await client.users.me();
```

### Core Package (Server-side)

```typescript
import { hashPassword, verifyPassword, createJWT, verifyJWT } from '@reasvyn/auth-core';

// Hash a password
const hash = await hashPassword('user-password');

// Verify password
const isValid = await verifyPassword('user-password', hash);

// Create JWT
const token = createJWT({ userId: '123' }, 'your-secret', { expiresIn: '7d' });

// Verify JWT
const payload = verifyJWT(token, 'your-secret');
```

## Development

### Setup

```bash
git clone https://github.com/reasvyn/auth-hub.git
cd auth-hub
npm install
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

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap

- [ ] Hosted SaaS dashboard with centralized user management
- [ ] Passkey/WebAuthn support
- [ ] SMS-based OTP
- [ ] Audit log & anomaly detection
- [ ] Multi-tenant support
- [ ] Admin SDK
- [ ] Next.js adapter
- [ ] Express.js middleware

## License

MIT © [Reas Vyn](https://github.com/reasvyn)
