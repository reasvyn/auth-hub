# @reasvyn/auth-node-sdk

HTTP client SDK for interacting with an auth-hub-compatible server. Works in Node.js 18+ and any fetch-capable environment. Uses the native `fetch` API — no extra dependencies.

## Installation

```bash
npm install @reasvyn/auth-node-sdk
```

## Usage

### Initialize the client

```typescript
import { AuthHubClient } from '@reasvyn/auth-node-sdk';

const client = new AuthHubClient({
  baseUrl: 'https://auth.myapp.com',   // Your auth server base URL
  timeout: 10_000,                      // Request timeout in ms (default: 10000)
  headers: {                            // Optional default headers
    'x-client-id': 'my-app',
  },
});
```

After login, set the access token for authenticated requests:

```typescript
const session = await client.auth.login({ email: 'user@example.com', password: 'secret' });
client.setAccessToken(session.accessToken!);
```

---

## `client.auth` — Authentication Module

### Login with email/password

```typescript
const session = await client.auth.login({
  email: 'user@example.com',
  password: 'my-password',
});
// session: AuthResponse { user, accessToken, refreshToken, expiresIn }
```

### Register a new user

```typescript
const session = await client.auth.register({
  email: 'newuser@example.com',
  password: 'secure-password',
  name: 'New User',
});
```

### Logout

```typescript
// Pass refresh token to revoke it server-side
await client.auth.logout(session.refreshToken);
```

### Refresh access token

```typescript
const newSession = await client.auth.refreshToken(session.refreshToken!);
client.setAccessToken(newSession.accessToken!);
```

### Magic link (passwordless)

```typescript
// Step 1: Send magic link to user's email
await client.auth.sendMagicLink('user@example.com');

// Step 2: Verify token from email link
const session = await client.auth.verifyMagicLink(tokenFromUrl);
```

### Email verification

```typescript
// Trigger sending a verification email (user must be authenticated)
await client.auth.sendEmailVerification();

// Verify with the token from the email
await client.auth.verifyEmail(tokenFromUrl);
```

### Password reset

```typescript
// Step 1: Request reset link (always returns 200 to prevent email enumeration)
await client.auth.requestPasswordReset('user@example.com');

// Step 2: Confirm reset with token from email
await client.auth.confirmPasswordReset(tokenFromUrl, 'new-secure-password');
```

### Change password (authenticated)

```typescript
await client.auth.changePassword('current-password', 'new-password');
```

### OAuth

```typescript
// Get the OAuth redirect URL from the server
const { url, state } = await client.auth.getOAuthUrl('google', 'https://myapp.com/callback');
// Redirect user to `url`

// After callback, exchange the code
const session = await client.auth.exchangeOAuthCode('google', code, state);
```

### Verify MFA code

```typescript
// Used when login requires MFA verification
const session = await client.auth.verifyMFA(code, mfaToken);
```

---

## `client.users` — User Module

> All methods require `setAccessToken()` to be called first.

### Get current user

```typescript
const me = await client.users.me();
// Returns: User { id, email, name, role, isEmailVerified, ... }
```

### Update profile

```typescript
const updated = await client.users.updateProfile({ name: 'New Name' });
```

### Update account settings

```typescript
await client.users.updateSettings({
  twoFactorEnabled: true,
  emailNotifications: false,
});
```

### Update avatar

```typescript
await client.users.updateAvatar('https://cdn.example.com/avatar.jpg');
```

### Delete account

```typescript
await client.users.deleteAccount('confirm-password');
```

### Admin — list users

```typescript
const result = await client.users.listUsers({ page: 1, limit: 20, role: 'user' });
// result: { users: User[], total: number, page: number, limit: number }
```

### Admin — get user by ID

```typescript
const user = await client.users.getUserById('user-id-123');
```

### Admin — update a user

```typescript
await client.users.updateUser('user-id-123', { role: 'admin' });
```

### Admin — delete a user

```typescript
await client.users.deleteUser('user-id-123');
```

---

## `client.sessions` — Sessions Module

> Requires authentication.

### List active sessions

```typescript
const sessions = await client.sessions.list();
// sessions: Session[] — each with id, device, ip, createdAt, lastActiveAt
```

### Get current session

```typescript
const current = await client.sessions.current();
```

### Revoke a specific session

```typescript
await client.sessions.revoke('session-id');
```

### Revoke all sessions (sign out everywhere)

```typescript
await client.sessions.revokeAll();
```

---

## `client.mfa` — MFA Module

> Requires authentication.

### Set up MFA

```typescript
const setup = await client.mfa.setup('totp');
// setup: MFASetupData { secret, qrCodeUrl, backupCodes }
// Show setup.qrCodeUrl in a <img> or QR component
```

### Verify MFA code (complete setup)

```typescript
await client.mfa.verify('123456', 'totp');
```

### Disable MFA

```typescript
await client.mfa.disable('totp', '123456');
```

### Regenerate backup codes

```typescript
const { backupCodes } = await client.mfa.regenerateBackupCodes('123456');
```

### List enabled MFA methods

```typescript
const methods = await client.mfa.listMethods();
// methods: TwoFactorMethod[] e.g. ['totp']
```

---

## Error Handling

The SDK throws `HttpError` on non-2xx responses:

```typescript
import { HttpError } from '@reasvyn/auth-node-sdk';

try {
  await client.auth.login({ email: 'x@x.com', password: 'wrong' });
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status);  // 401
    console.log(err.code);    // 'UNAUTHORIZED'
    console.log(err.message); // 'Invalid credentials'
  }
}
```

---

## Using with `@reasvyn/auth-react`

The SDK can be used to implement a custom `AuthAdapter` for the React package:

```typescript
import { AuthHubClient } from '@reasvyn/auth-node-sdk';
import type { AuthAdapter } from '@reasvyn/auth-react';

const client = new AuthHubClient({ baseUrl: 'https://auth.myapp.com' });

const adapter: AuthAdapter = {
  login: async (credentials) => {
    const res = await client.auth.login(credentials);
    client.setAccessToken(res.accessToken!);
    return res;
  },
  register: (credentials) => client.auth.register(credentials),
  logout: (refreshToken) => client.auth.logout(refreshToken),
  refreshToken: async (token) => {
    const res = await client.auth.refreshToken(token);
    client.setAccessToken(res.accessToken!);
    return res;
  },
  getUser: () => client.users.me(),
  sendMagicLink: (email) => client.auth.sendMagicLink(email),
  requestPasswordReset: (email) => client.auth.requestPasswordReset(email),
  confirmPasswordReset: (token, pw) => client.auth.confirmPasswordReset(token, pw),
  changePassword: (cur, next) => client.auth.changePassword(cur, next),
  getSessions: () => client.sessions.list(),
  revokeSession: (id) => client.sessions.revoke(id),
  revokeAllSessions: () => client.sessions.revokeAll(),
  setupMFA: (method) => client.mfa.setup(method),
  verifyMFA: (code, method) => client.mfa.verify(code, method),
  disableMFA: (method, code) => client.mfa.disable(method, code),
};
```

---

## API Reference

| Client Property | Type | Description |
|----------------|------|-------------|
| `client.auth` | `AuthModule` | Authentication flows |
| `client.users` | `UsersModule` | User profile & admin |
| `client.sessions` | `SessionsModule` | Session management |
| `client.mfa` | `MFAModule` | Multi-factor authentication |
| `client.setAccessToken(token)` | `this` | Set Bearer token for requests |

### `AuthHubClientConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `baseUrl` | `string` | — | **Required.** Auth server base URL |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Default headers sent with every request |
