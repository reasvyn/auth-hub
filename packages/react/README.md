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

---

## API Reference

### `AuthProvider` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adapter` | `AuthAdapter` | — | **Required.** Backend adapter implementation |
| `children` | `ReactNode` | — | **Required.** |
| `onLogin` | `(user: User) => void` | — | Called after successful login or register |
| `onLogout` | `() => void` | — | Called after logout |
| `onError` | `(error: string) => void` | — | Called on auth errors |
| `refreshBeforeExpiry` | `number` | `60000` | How many ms before token expiry to proactively refresh |

### `AuthAdapter` Interface

```typescript
interface AuthAdapter {
  // Required
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(refreshToken?: string): Promise<void>;
  refreshToken(token: string): Promise<AuthResponse>;
  getUser(): Promise<User | null>;

  // Optional — enables features when provided
  loginWithOAuth?(provider: OAuthProvider): Promise<void>;
  sendMagicLink?(email: string): Promise<void>;
  verifyMagicLink?(token: string): Promise<AuthResponse>;
  sendEmailVerification?(): Promise<void>;
  verifyEmail?(token: string): Promise<void>;
  requestPasswordReset?(email: string): Promise<void>;
  confirmPasswordReset?(token: string, newPassword: string): Promise<void>;
  changePassword?(currentPassword: string, newPassword: string): Promise<void>;
  setupMFA?(method: TwoFactorMethod): Promise<MFASetupData>;
  verifyMFA?(code: string, method: TwoFactorMethod): Promise<AuthResponse>;
  disableMFA?(method: TwoFactorMethod, code: string): Promise<void>;
  getSessions?(): Promise<Session[]>;
  revokeSession?(sessionId: string): Promise<void>;
  revokeAllSessions?(): Promise<void>;
}
```

### `useAuth()` Return Value

```typescript
interface AuthContextValue {
  // State
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  accessToken: string | null;
  error: string | null;

  // Actions
  login(credentials: LoginCredentials): Promise<void>;
  register(credentials: RegisterCredentials): Promise<void>;
  logout(): Promise<void>;
  loginWithOAuth(provider: OAuthProvider): Promise<void>;
  sendMagicLink(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  clearError(): void;
}
```

### Component Props

#### `LoginForm`

| Prop | Type | Description |
|------|------|-------------|
| `providers` | `OAuthProvider[]` | OAuth providers to show buttons for |
| `enableMagicLink` | `boolean` | Show "Send magic link" option |
| `onSuccess` | `(resp: AuthResponse) => void` | Called after successful login |
| `onError` | `(error: string) => void` | Called on error |
| `redirectTo` | `string` | URL to navigate to after login (handled by caller via `onSuccess`) |
| `className` | `string` | Additional CSS classes for the card |

#### `RegisterForm`

| Prop | Type | Description |
|------|------|-------------|
| `providers` | `OAuthProvider[]` | OAuth providers to show |
| `onSuccess` | `(resp: AuthResponse) => void` | Called after registration |
| `onError` | `(error: string) => void` | Called on error |
| `className` | `string` | Additional CSS classes |

#### `ForgotPasswordForm`

| Prop | Type | Description |
|------|------|-------------|
| `onSuccess` | `() => void` | Called after email is sent |
| `onError` | `(error: string) => void` | Called on error |
| `onBack` | `() => void` | Called when "Back to login" is clicked |
| `className` | `string` | Additional CSS classes |

#### `ChangePasswordForm`

| Prop | Type | Description |
|------|------|-------------|
| `onSuccess` | `() => void` | Called after password change |
| `onError` | `(error: string) => void` | Called on error |
| `className` | `string` | Additional CSS classes |

#### `MFASetupForm`

| Prop | Type | Description |
|------|------|-------------|
| `method` | `TwoFactorMethod` | `'totp'`, `'sms'`, or `'email'` |
| `onSuccess` | `(data: MFASetupData) => void` | Called with setup data (secret, QR URL, backup codes) |
| `onError` | `(error: string) => void` | Called on error |
| `onCancel` | `() => void` | Called when cancelled |
| `className` | `string` | Additional CSS classes |

#### `MFAVerifyForm`

| Prop | Type | Description |
|------|------|-------------|
| `method` | `TwoFactorMethod` | MFA method being verified |
| `onSuccess` | `(resp: AuthResponse) => void` | Called with session on success |
| `onError` | `(error: string) => void` | Called on error |
| `onBack` | `() => void` | Called when "Back" is clicked |
| `className` | `string` | Additional CSS classes |

#### `UserProfile`

| Prop | Type | Description |
|------|------|-------------|
| `onUpdate` | `(user: User) => void` | Called after profile update |
| `onError` | `(error: string) => void` | Called on error |
| `className` | `string` | Additional CSS classes |

#### `SessionsList`

| Prop | Type | Description |
|------|------|-------------|
| `onRevoke` | `(sessionId: string) => void` | Called after session revocation |
| `onRevokeAll` | `() => void` | Called after all sessions revoked |
| `className` | `string` | Additional CSS classes |

#### `OAuthProvider` values

```typescript
type OAuthProvider = 'google' | 'github' | 'discord' | 'facebook' | 'apple' | 'twitter';
```

---

## Session Persistence

`AuthProvider` automatically:

1. **On mount** — reads `auth_refresh_token` from `localStorage` and tries to restore the session via `adapter.refreshToken()`.
2. **On login / register** — stores the refresh token to `localStorage`.
3. **On logout** — removes the refresh token from `localStorage`.
4. **Proactive refresh** — schedules a token refresh `refreshBeforeExpiry` ms (default: 60 s) before the access token expires, keeping the session alive transparently.

> **SSR note:** `localStorage` access is guarded with `typeof window !== 'undefined'` — safe for Next.js server rendering.

