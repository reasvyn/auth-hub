# @reasvyn/auth-react

React components and hooks for Auth-Hub — Tailwind CSS, dark mode ready, fully typed.

## Installation

```bash
npm install @reasvyn/auth-react
```

> **Requires** React ≥18 and TailwindCSS ≥3 in your project.

## Tailwind Setup

Add the package to your `tailwind.config.js` content array so utility classes are included in your build:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@reasvyn/auth-react/dist/**/*.js',
  ],
  // ...
};
```

## Dark Mode

Dark mode uses Tailwind's `class` strategy. Add the `dark` class to your `<html>` element to enable it:

```html
<html class="dark">...</html>
```

Or toggle it with JavaScript:

```ts
document.documentElement.classList.toggle('dark');
```

## Quick Start

### 1. Create an adapter

The adapter connects the UI to your backend. Implement the `AuthAdapter` interface:

```ts
import type { AuthAdapter } from '@reasvyn/auth-react';

const myAdapter: AuthAdapter = {
  async login({ email, password }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json(); // { user, accessToken, refreshToken, expiresIn }
  },
  async register(credentials) { /* ... */ },
  async logout() { /* ... */ },
  async refreshToken(token) { /* ... */ },
  async getUser() { /* ... */ },
};
```

### 2. Wrap your app with `AuthProvider`

```tsx
import { AuthProvider } from '@reasvyn/auth-react';

function App() {
  return (
    <AuthProvider adapter={myAdapter} onLogin={(user) => console.log('Logged in', user)}>
      <YourApp />
    </AuthProvider>
  );
}
```

### 3. Use components

```tsx
import {
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ChangePasswordForm,
  MFAVerifyForm,
  UserProfile,
  SessionsList,
} from '@reasvyn/auth-react';

// Login page
<LoginForm
  providers={['google', 'github']}
  enableMagicLink
  onSuccess={(resp) => router.push('/dashboard')}
/>

// Register page
<RegisterForm
  providers={['google']}
  onSuccess={() => router.push('/onboarding')}
/>

// Forgot password
<ForgotPasswordForm onBack={() => router.push('/login')} />

// Change password (authenticated)
<ChangePasswordForm onSuccess={() => toast('Password updated!')} />

// MFA verification
<MFAVerifyForm method="totp" onSuccess={(resp) => handleMFASuccess(resp)} />

// User profile card
<UserProfile />

// Active sessions
<SessionsList adapter={myAdapter} />
```

### 4. Use hooks

```tsx
import { useAuth, useUser, useMFA, useSession } from '@reasvyn/auth-react';

function Dashboard() {
  const { user, logout } = useAuth();
  const { displayName, isEmailVerified } = useUser();
  const mfa = useMFA(myAdapter);

  return (
    <div>
      <p>Welcome, {displayName()}</p>
      {!isEmailVerified() && <p>Please verify your email.</p>}
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `LoginForm` | Email/password + OAuth + magic link |
| `RegisterForm` | Registration with password strength indicator |
| `ForgotPasswordForm` | Send password reset email |
| `ChangePasswordForm` | Change password (authenticated) |
| `MFASetupForm` | Set up TOTP / SMS / Email 2FA |
| `MFAVerifyForm` | Verify 2FA code during login |
| `UserProfile` | Display user info, role, verification status |
| `SessionsList` | List and revoke active sessions |
| `OAuthButton` | Single OAuth provider button |
| `PasswordStrengthIndicator` | Visual password strength meter |

## Primitive UI Components

All form primitives are exported for custom composition:

```tsx
import { Card, Heading, Input, Button, Field, ErrorAlert, Divider } from '@reasvyn/auth-react';
```

## Hooks

| Hook | Description |
|------|-------------|
| `useAuth()` | Auth state + login/logout/register actions |
| `useUser()` | User helpers: `displayName()`, `hasRole()`, `isEmailVerified()` |
| `useMFA(adapter)` | MFA setup, verify, disable |
| `useSession(adapter)` | Session list, revoke, revokeAll |
