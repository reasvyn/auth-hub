# @reasvyn/auth-nextjs

Next.js integration layer for Auth-TS.

## Overview

`@reasvyn/auth-nextjs` combines server helpers, an Edge middleware factory, and a client adapter for wiring Auth-TS flows into Next.js applications.

It exposes three main surfaces:

- `@reasvyn/auth-nextjs` for server helpers and re-exports from `@reasvyn/auth-react`
- `@reasvyn/auth-nextjs/client` for `createNextJsAdapter()`
- `@reasvyn/auth-nextjs/middleware` for `createAuthMiddleware()`

## Key Features

- `createNextJsAdapter()` for client-side integration with auth routes
- Edge-compatible auth middleware
- `getServerSession()` for App Router server components
- `withAuth()` for authenticated route handlers
- Re-exports of `@reasvyn/auth-react` for convenience
- `verifyAccessToken()` for low-level token verification

## Minimum Requirements

### Runtime Requirements

- Next.js >= 13.0.0
- React >= 18.0.0
- React DOM >= 18.0.0

### Tech Stack

- TypeScript 5.x
- Next.js App Router / Route Handlers
- Edge runtime support via Web Crypto API
- Shared auth contracts from `@reasvyn/auth-types`

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-nextjs @reasvyn/auth-react
```

### 2. Add Edge Middleware

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

### 3. Add the Client Adapter

```tsx
'use client';

import { AuthProvider } from '@reasvyn/auth-react';
import { createNextJsAdapter } from '@reasvyn/auth-nextjs/client';

const adapter = createNextJsAdapter({ basePath: '/api/auth' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider adapter={adapter}>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 4. Read Session on the Server

```tsx
import { headers } from 'next/headers';
import { getServerSession } from '@reasvyn/auth-nextjs';

export default async function DashboardPage() {
  const session = getServerSession(await headers());

  if (!session) {
    return null;
  }

  return <h1>{session.email}</h1>;
}
```

## Technical Reference

### Root Exports

- `getServerSession`
- `verifyAccessToken`
- `withAuth`
- re-exports from `@reasvyn/auth-react`

### `@reasvyn/auth-nextjs/middleware`

`createAuthMiddleware(options)` verifies the incoming access token using Edge-compatible HMAC verification and forwards:

- `x-auth-user-id`
- `x-auth-user-email`
- `x-auth-user-role`

It returns:

- `401 JSON` for API requests without valid auth
- redirect to `loginPath` for page requests without valid auth

### `@reasvyn/auth-nextjs/client`

`createNextJsAdapter(options)` returns an `AuthAdapter` that calls route paths under `basePath` such as:

- `/login`
- `/register`
- `/logout`
- `/refresh`
- `/magic-link`
- `/magic-link/verify`
- `/email/send-verification`
- `/email/verify`
- `/password/reset`
- `/password/reset/confirm`
- `/password/change`
- `/oauth/url`
- `/mfa/setup`
- `/mfa/verify`
- `/mfa/disable`
- `/sessions`

### `withAuth()`

`withAuth(options, handler)` wraps an App Router route handler and resolves `session` before your handler executes.

```ts
export const GET = withAuth(
  { secret: process.env.JWT_ACCESS_SECRET! },
  async (_req, { session }) => Response.json({ userId: session.userId }),
);
```

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../../CONTRIBUTING.md) when changing middleware semantics, header forwarding, or route adapter behavior.

## Security

This package participates in auth enforcement and token verification. Report issues through the root [SECURITY.md](../../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
