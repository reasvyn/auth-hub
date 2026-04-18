# @reasvyn/auth-node-sdk

Typed HTTP SDK for Auth-TS-compatible APIs.

## Overview

`@reasvyn/auth-node-sdk` provides a fetch-based client for interacting with auth APIs that follow the Auth-TS route and envelope conventions. It is organized into focused modules:

- `client.auth`
- `client.users`
- `client.sessions`
- `client.mfa`

The package works in Node.js 18+ and any environment that provides `fetch`.

## Key Features

- `AuthClient` entrypoint with typed submodules
- Modular APIs for auth, users, sessions, and MFA
- Bearer token support through `setAccessToken()`
- Native `fetch`-based transport with timeout support
- Shared request and response contracts via `@reasvyn/auth-types`
- Reusable `HttpClient` and `HttpError` exports

## Minimum Requirements

### Runtime Requirements

- Node.js >= 18.0.0 or another fetch-capable runtime

### Tech Stack

- TypeScript 5.x
- Native `fetch`
- JSON API integration with Auth-TS response envelopes

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-node-sdk
```

### 2. Create a Client

```ts
import { AuthClient } from '@reasvyn/auth-node-sdk';

const client = new AuthClient({
  baseUrl: 'https://auth.example.com',
  timeout: 10_000,
  headers: {
    'x-client-id': 'my-app',
  },
});
```

### 3. Authenticate and Reuse the Access Token

```ts
const auth = await client.auth.login({
  email: 'user@example.com',
  password: 'secret',
});

client.setAccessToken(auth.session?.accessToken ?? null);
```

### 4. Call Other Modules

```ts
const me = await client.users.me();
const sessions = await client.sessions.list();
const setup = await client.mfa.setup('totp');
```

## Technical Reference

### Top-Level Exports

- `AuthClient`
- `AuthClientConfig`
- `HttpClient`
- `HttpError`
- `AuthModule`
- `UsersModule`
- `SessionsModule`
- `MFAModule`

### `AuthClientConfig`

```ts
interface AuthClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}
```

### `client.auth`

`AuthModule` methods:

- `login(credentials)`
- `register(credentials)`
- `logout(refreshToken?)`
- `refreshToken(refreshToken)`
- `sendMagicLink(email)`
- `verifyMagicLink(token)`
- `sendEmailVerification()`
- `verifyEmail(token)`
- `requestPasswordReset(email)`
- `confirmPasswordReset(token, newPassword)`
- `changePassword(currentPassword, newPassword)`
- `getOAuthUrl(provider, redirectUri)`
- `exchangeOAuthCode(provider, code, state)`
- `verifyMFA(code, method)`

### `client.users`

`UsersModule` methods:

- `me()`
- `updateProfile(data)`
- `updateSettings(data)`
- `updateAvatar(avatarUrl)`
- `deleteAccount(password)`
- `list(params?)`
- `getById(userId)`
- `updateUser(userId, data)`
- `deleteUser(userId)`

### `client.sessions`

`SessionsModule` methods:

- `list()`
- `current()`
- `revoke(sessionId)`
- `revokeAll()`

### `client.mfa`

`MFAModule` methods:

- `setup(method)`
- `verify(code, method)`
- `disable(method, code)`
- `regenerateBackupCodes(code)`
- `listMethods()`

### Error Handling

The SDK throws `HttpError` when the server returns a non-success response or when transport-level failures occur.

```ts
import { AuthClient, HttpError } from '@reasvyn/auth-node-sdk';

try {
  await client.auth.login({ email: 'user@example.com', password: 'wrong' });
} catch (error) {
  if (error instanceof HttpError) {
    console.error(error.status, error.code, error.message);
  }
}
```

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md) when changing routes, client method names, or request/response contracts.

## Security

If you find an issue related to auth transport, token handling, or client-side credential flow, use the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
