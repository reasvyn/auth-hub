# @reasvyn/auth-react

React auth context, hooks, and UI components for Auth-TS.

## Overview

`@reasvyn/auth-react` provides the client-facing React layer for Auth-TS. It includes:

- `AuthProvider` and `AuthContext`
- hooks for auth, session, MFA, and user state
- ready-to-use auth forms and account UI
- UI primitives for custom composition

The package is adapter-driven. You bring an `AuthAdapter` implementation, and the package handles state, refresh behavior, and reusable UI on top of it.

## Key Features

- Prebuilt components for login, register, password reset, MFA, profile, and sessions
- `AuthProvider` with built-in auth state management
- Hook-based access via `useAuth()`, `useUser()`, `useMFA()`, and `useSession()`
- Typed adapter contract shared with the rest of Auth-TS
- UI primitives for custom screens
- Tailwind-friendly styling and dark-mode compatibility

## Minimum Requirements

### Runtime Requirements

- React >= 18.0.0
- React DOM >= 18.0.0
- TailwindCSS >= 3.0.0 for the packaged styles

### Tech Stack

- TypeScript 5.x
- React context and hooks
- Tailwind utility classes with dark-mode support
- Shared contracts from `@reasvyn/auth-types`

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-react
```

### 2. Create an Adapter

```ts
import type { AuthAdapter } from '@reasvyn/auth-react';

export const adapter: AuthAdapter = {
  login: async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    return response.json();
  },
  register: async (credentials) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    return response.json();
  },
  logout: async () => undefined,
  refreshToken: async (token) => ({ success: true, session: { accessToken: token, expiresAt: new Date(), tokenType: 'Bearer' } }),
  getUser: async () => null,
};
```

### 3. Wrap Your App

```tsx
import { AuthProvider } from '@reasvyn/auth-react';

export function App({ children }: { children: React.ReactNode }) {
  return <AuthProvider adapter={adapter}>{children}</AuthProvider>;
}
```

### 4. Use Hooks and Components

```tsx
import { LoginForm, useAuth, useUser } from '@reasvyn/auth-react';

export function LoginPage() {
  return <LoginForm providers={['google', 'github']} enableMagicLink />;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const { displayName } = useUser();

  return (
    <div>
      <p>Hello, {displayName() ?? user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Technical Reference

### Primary Exports

#### Context and Provider

- `AuthContext`
- `AuthProvider`

#### Hooks

- `useAuth`
- `useSession`
- `useMFA`
- `useUser`

#### Components

- `LoginForm`
- `RegisterForm`
- `ForgotPasswordForm`
- `ChangePasswordForm`
- `MFASetupForm`
- `MFAVerifyForm`
- `UserProfile`
- `SessionsList`
- `OAuthButton`
- `PasswordStrengthIndicator`

#### UI Primitives

- `Card`
- `Heading`
- `Subheading`
- `ErrorAlert`
- `SuccessAlert`
- `Label`
- `Input`
- `Button`
- `Spinner`
- `TextButton`
- `Divider`
- `Field`

### `AuthAdapter` Contract

Required methods:

- `login(credentials)`
- `register(credentials)`
- `logout(refreshToken?)`
- `refreshToken(token)`
- `getUser()`

Optional methods progressively enable features such as:

- OAuth
- magic link
- email verification
- password reset
- MFA
- session management

Notably, session UI currently expects `getSessions?(): Promise<ActiveSession[]>`.

### Auth State Model

`AuthProvider` exposes an `AuthContextValue` with:

- `user`
- `status`
- `accessToken`
- `error`
- actions such as `login()`, `register()`, `logout()`, `changePassword()`, and `clearError()`

### Refresh Behavior

`AuthProvider` accepts `refreshBeforeExpiry?: number`, allowing access-token refresh to happen proactively before expiry.

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md) when changing component props, adapter contracts, or any exported UI behavior.

## Security

If you discover a security issue in auth flows, client state handling, or session UI behavior, use the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
