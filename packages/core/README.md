# @reasvyn/auth-core

Framework-agnostic authentication primitives for Auth-TS.

## Overview

`@reasvyn/auth-core` contains the reusable low-level building blocks for implementing authentication and security flows. It is intended for server-side use, adapters, custom backends, and infrastructure code that needs password hashing, token generation, validation, MFA helpers, and structured error handling.

The package does not depend on a web framework. Instead, higher-level packages such as `@reasvyn/auth-express` and `@reasvyn/auth-nextjs` compose these primitives into framework-specific integrations.

## Key Features

- Password hashing and verification
- JWT creation, verification, and token-pair generation
- Credential security helpers for OTP challenges, recovery codes, and user security overviews
- Magic link and email verification token utilities
- MFA/TOTP generation and verification
- Validation helpers and structured runtime errors
- OAuth URL helpers
- In-memory rate limiting and brute-force protection
- CSRF utilities
- Lightweight logging helpers

## Minimum Requirements

### Runtime Requirements

- Node.js >= 18.0.0

### Tech Stack

- TypeScript 5.x
- `bcryptjs` for password hashing
- `jsonwebtoken` for JWT signing and verification
- `zod` for validation
- `speakeasy` and `qrcode` for TOTP setup flows
- `uuid` for token and identifier utilities

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-core
```

### 2. Hash Passwords and Create Tokens

```ts
import { hashPassword, verifyPassword, createTokenPair } from '@reasvyn/auth-core';

const passwordHash = await hashPassword('StrongPassword123!');
const isValid = await verifyPassword('StrongPassword123!', passwordHash);

const { accessToken, refreshToken } = createTokenPair(
  { sub: 'user_1', email: 'user@example.com', role: 'user' },
  process.env.JWT_ACCESS_SECRET!,
  process.env.JWT_REFRESH_SECRET!,
);
```

### 3. Generate a Magic Link

```ts
import { generateMagicLinkToken, verifyMagicLinkToken } from '@reasvyn/auth-core';

const { token, url } = generateMagicLinkToken('user@example.com', {
  secret: process.env.HMAC_SECRET!,
  baseUrl: 'https://myapp.com/auth/magic-link/verify',
});

const result = verifyMagicLinkToken(token, process.env.HMAC_SECRET!);
if (result.valid) {
  console.log(result.email);
}
```

## Technical Reference

### Exported Modules

`@reasvyn/auth-core` re-exports functionality from:

- `auth/jwt`
- `auth/magic-link`
- `auth/email-verification`
- `auth/oauth`
- `security/password`
- `security/credential-security`
- `security/rate-limiter`
- `security/csrf`
- `security/totp`
- `security/brute-force`
- `utils/errors`
- `utils/validation`
- `utils/logger`
- `utils/constants`

### Structured Runtime Errors

The runtime error class exported by this package is:

```ts
import { AuthError, Errors, isAuthError } from '@reasvyn/auth-core';
```

- `AuthError` is the runtime `Error` subclass
- `Errors` is the convenience factory collection
- `isAuthError()` is the type guard for caught errors

```ts
try {
  throw Errors.invalidCredentials();
} catch (error) {
  if (isAuthError(error)) {
    console.error(error.code, error.statusCode, error.message);
  }
}
```

### Password Utilities

Typical password flow:

```ts
import { hashPassword, verifyPassword, validatePasswordStrength } from '@reasvyn/auth-core';

const strength = validatePasswordStrength('StrongPassword123!');
if (!strength.isValid) {
  throw new Error(strength.errors.join(', '));
}
```

### JWT Utilities

The JWT helpers expect a `JWTPayload`-compatible input:

```ts
import { createJWT, verifyJWT } from '@reasvyn/auth-core';

const token = createJWT(
  { sub: 'user_1', email: 'user@example.com', role: 'admin' },
  process.env.JWT_ACCESS_SECRET!,
  { expiresIn: '15m' },
);

const payload = verifyJWT(token, process.env.JWT_ACCESS_SECRET!);
```

### TOTP Utilities

`generateTOTPSecret()` returns setup data suitable for enrollment screens, while `verifyTOTPCode()` validates user input during setup or login.

### Credential Security Utilities

Use `credential-security` helpers when you need secure building blocks for built-in credential auth without re-implementing cryptographic primitives:

```ts
import {
  createOneTimeCodeChallenge,
  createUserSecurityOverview,
  generateOneTimeCode,
  generateRecoveryCodes,
  hashOneTimeCode,
} from '@reasvyn/auth-core';

const code = generateOneTimeCode();
const codeHash = hashOneTimeCode(code, { secret: process.env.OTP_SECRET! });

const challenge = createOneTimeCodeChallenge({
  purpose: 'password_reset',
  method: 'email',
  userId: 'user_1',
  destination: 'user@example.com',
});

const recoveryCodes = generateRecoveryCodes();

const overview = createUserSecurityOverview({
  userId: 'user_1',
  userStatus: 'active',
  emailVerified: true,
  passwordConfigured: true,
  passwordLastChangedAt: new Date(),
  methods: [],
  recoveryCodesRemaining: recoveryCodes.length,
});
```

### Validation Helpers

The package exports schema helpers such as `loginSchema`, `registerSchema`, and `safeValidate()` to support adapters without duplicating validation logic.

## License

MIT

## Contributing

Changes to this package should follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md), especially because API changes here usually cascade into adapters and SDKs.

## Security

This package is security-sensitive by design. For vulnerability reports or concerns, use the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
