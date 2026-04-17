# @reasvyn/auth-nextjs

Full-stack authentication adapter for Next.js 13+ (App Router). Includes:

- **Edge Middleware** — protect routes before they render, using the Web Crypto API (no Node.js runtime required)
- **Server-side helpers** — `getServerSession` for Server Components, `withAuth` for Route Handlers
- **Client adapter** — `createNextJsAdapter` connects `@reasvyn/auth-react` components to your Next.js API routes
- **Re-exports** all `@reasvyn/auth-react` components and hooks for convenience

## Installation

```bash
npm install @reasvyn/auth-nextjs @reasvyn/auth-react
```

> **Note:** You also need TailwindCSS configured in your Next.js project for the React components to render correctly.

---

## Package Exports

| Export path | Use in | Description |
|------------|--------|-------------|
| `@reasvyn/auth-nextjs` | Server | `getServerSession`, `verifyAccessToken`, `withAuth` + re-exports from auth-react |
| `@reasvyn/auth-nextjs/middleware` | Edge | `createAuthMiddleware` |
| `@reasvyn/auth-nextjs/client` | Client | `createNextJsAdapter` |

---

## 1. Edge Middleware

Create `middleware.ts` at the root of your Next.js project (same level as `app/`):

```typescript
// middleware.ts
import { createAuthMiddleware } from '@reasvyn/auth-nextjs/middleware';

export const middleware = createAuthMiddleware({
  secret: process.env.JWT_SECRET!,
  loginPath: '/login',      // Where to redirect unauthenticated users
  cookieName: 'access_token', // Cookie holding the JWT (default)
});

// Run middleware only on these paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/api/protected/:path*',
  ],
};
```

### How it works

1. Reads the JWT from the `access_token` cookie **or** the `Authorization: Bearer <token>` header.
2. Verifies the signature and expiry using `crypto.subtle` (HMAC-SHA256) — fully Edge-compatible, no Node.js crypto.
3. **Page routes**: redirects unauthenticated requests to `loginPath?from=/original-path`.
4. **API routes** (`/api/*`): returns `401 JSON` instead of redirecting.
5. Injects auth info into request headers for downstream Server Components:
   - `x-auth-user-id`
   - `x-auth-user-email`
   - `x-auth-user-role`

### `NextAuthMiddlewareOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `secret` | `string` | — | **Required.** JWT access token secret (same one used to sign tokens) |
| `loginPath` | `string` | `'/login'` | Redirect target for unauthenticated page requests |
| `cookieName` | `string` | `'access_token'` | Cookie name holding the access token |

---

## 2. Server-side Helpers

Use inside **Server Components**, **Route Handlers**, and **Server Actions**.

### `getServerSession(headers)`

Reads the `x-auth-*` headers injected by the Edge middleware. Returns `null` if the user is not authenticated.

```typescript
// app/dashboard/page.tsx
import { headers } from 'next/headers';
import { getServerSession } from '@reasvyn/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(await headers());
  if (!session) redirect('/login');

  return (
    <div>
      <h1>Welcome, {session.email}</h1>
      <p>Role: {session.role}</p>
    </div>
  );
}
```

#### `AuthSession`

```typescript
interface AuthSession {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  raw: JWTPayload;
}
```

### `withAuth(options, handler)`

Wraps a Route Handler with JWT verification. Token is read from the `Authorization: Bearer` header or the access token cookie.

```typescript
// app/api/me/route.ts
import { withAuth } from '@reasvyn/auth-nextjs';

export const GET = withAuth(
  { secret: process.env.JWT_SECRET! },
  async (req, { session }) => {
    return Response.json({
      userId: session.userId,
      email: session.email,
      role: session.role,
    });
  },
);
```

Returns `401 JSON` if the token is missing or invalid — no redirect.

#### `WithAuthOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `secret` | `string` | — | **Required.** JWT access token secret |
| `cookieName` | `string` | `'access_token'` | Cookie name |

### `verifyAccessToken(token, secret)`

Low-level helper. Verifies a JWT and returns the payload, or `null` if invalid:

```typescript
import { verifyAccessToken } from '@reasvyn/auth-nextjs';

const payload = verifyAccessToken(token, process.env.JWT_SECRET!);
if (!payload) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 3. Client Adapter

Connects `@reasvyn/auth-react` components to your Next.js API routes. Add to your **Client Component** root layout:

```tsx
// app/layout.tsx
'use client';
import { AuthProvider } from '@reasvyn/auth-react';
import { createNextJsAdapter } from '@reasvyn/auth-nextjs/client';

const adapter = createNextJsAdapter({
  basePath: '/api/auth', // Default — where your auth API routes are mounted
});

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

The adapter automatically handles `credentials: 'include'` for cookies and parses the `{ success, data }` response envelope.

### API routes the adapter calls

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `POST` | `/api/auth/refresh` | Rotate tokens |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/magic-link` | Send magic link |
| `POST` | `/api/auth/magic-link/verify` | Verify magic link token |
| `POST` | `/api/auth/email/send-verification` | Send verification email |
| `POST` | `/api/auth/email/verify` | Verify email token |
| `POST` | `/api/auth/password/reset` | Request password reset |
| `POST` | `/api/auth/password/reset/confirm` | Confirm password reset |
| `POST` | `/api/auth/password/change` | Change password |
| `POST` | `/api/auth/oauth/url` | Get OAuth redirect URL |
| `GET` | `/api/auth/sessions` | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Revoke a session |
| `DELETE` | `/api/auth/sessions` | Revoke all sessions |
| `POST` | `/api/auth/mfa/setup` | Start MFA setup |
| `POST` | `/api/auth/mfa/verify` | Verify MFA code |
| `POST` | `/api/auth/mfa/disable` | Disable MFA |

You can implement these routes using `@reasvyn/auth-express` on a separate API server, or write Next.js Route Handlers that call your database directly.

### `NextJsAdapterOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `basePath` | `string` | `'/api/auth'` | Base path for auth API routes |

---

## Complete Example: Next.js App with Full Auth

### Project structure

```
app/
├── layout.tsx          ← AuthProvider with createNextJsAdapter
├── login/page.tsx      ← LoginForm component
├── register/page.tsx   ← RegisterForm component
├── dashboard/page.tsx  ← Protected server component
├── settings/
│   ├── page.tsx        ← UserProfile, ChangePasswordForm
│   └── sessions/page.tsx ← SessionsList
└── api/auth/
    ├── [...route]/route.ts  ← Auth route handlers
    └── me/route.ts
middleware.ts
```

### Login page

```tsx
// app/login/page.tsx
'use client';
import { LoginForm } from '@reasvyn/auth-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <LoginForm
        providers={['google', 'github']}
        enableMagicLink
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}
```

### Register page

```tsx
// app/register/page.tsx
'use client';
import { RegisterForm } from '@reasvyn/auth-react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <RegisterForm
        providers={['google', 'github']}
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}
```

### Protected server component

```tsx
// app/dashboard/page.tsx
import { headers } from 'next/headers';
import { getServerSession } from '@reasvyn/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(await headers());
  if (!session) redirect('/login');

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold dark:text-white">
        Welcome back, {session.email}
      </h1>
    </main>
  );
}
```

### Settings page with profile & sessions

```tsx
// app/settings/page.tsx
'use client';
import { UserProfile, ChangePasswordForm, SessionsList } from '@reasvyn/auth-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <UserProfile />
      <ChangePasswordForm />
      <SessionsList />
    </div>
  );
}
```

### Protected Route Handler

```typescript
// app/api/protected/data/route.ts
import { withAuth } from '@reasvyn/auth-nextjs';

export const GET = withAuth(
  { secret: process.env.JWT_SECRET! },
  async (_req, { session }) => {
    // Fetch data specific to session.userId
    const data = await db.getDataForUser(session.userId);
    return Response.json({ data });
  },
);
```

---

## Dark Mode

Components from `@reasvyn/auth-react` support Tailwind's `class`-based dark mode. Add the `dark` class to your `<html>` element:

```tsx
// app/layout.tsx
<html lang="en" className={isDark ? 'dark' : ''}>
```

Or use a theme hook:

```tsx
'use client';
import { useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const toggle = () => {
    setDark((d) => !d);
    document.documentElement.classList.toggle('dark');
  };
  return <button onClick={toggle}>{dark ? '☀️' : '🌙'}</button>;
}
```

---

## Environment Variables

```env
JWT_SECRET=your-jwt-secret-min-32-chars
```

> This must be the same secret used to sign tokens in your auth server (e.g. the `jwtAccessSecret` passed to `createAuthRouter` in `@reasvyn/auth-express`).
