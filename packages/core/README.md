# @auth-hub/core

Core authentication logic for Auth-Hub — framework-agnostic. Provides the building blocks for authentication: password hashing, JWT management, TOTP 2FA, rate limiting, CSRF protection, and more.

## Installation

```bash
npm install @auth-hub/core
```

## Features

- 🔐 **Password hashing** (bcrypt) with strength validation
- 🎫 **JWT creation & verification** with token pair support
- 🔗 **Magic link** generation & validation
- 📧 **Email verification** token utilities
- 🌐 **OAuth2** authorization URL generation
- 🛡️ **CSRF** token generation & validation
- 📱 **TOTP/2FA** utilities via speakeasy
- 🚫 **Rate limiting** (in-memory)
- 🔒 **Brute force protection**
- ✅ **Validation** helpers (zod-based)
- 📝 **Logging** utilities

## Usage

### Password Utilities

```typescript
import { hashPassword, verifyPassword, validatePasswordStrength } from '@auth-hub/core';

// Hash a password
const hash = await hashPassword('myPassword123!');

// Verify
const isValid = await verifyPassword('myPassword123!', hash);

// Check strength
const { isValid, errors, strength } = validatePasswordStrength('weak');
```

### JWT Tokens

```typescript
import { createJWT, verifyJWT, createTokenPair } from '@auth-hub/core';

// Create access token
const token = createJWT(
  { sub: 'user123', email: 'user@example.com', role: 'user' },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
);

// Verify
const payload = verifyJWT(token, process.env.JWT_SECRET!);

// Create token pair (access + refresh)
const { accessToken, refreshToken } = createTokenPair(
  { sub: 'user123', email: 'user@example.com', role: 'user' },
  process.env.JWT_ACCESS_SECRET!,
  process.env.JWT_REFRESH_SECRET!,
);
```

### Magic Links

```typescript
import { generateMagicLinkToken, verifyMagicLinkToken } from '@auth-hub/core';

const { token, url } = generateMagicLinkToken('user@example.com', {
  secret: process.env.MAGIC_LINK_SECRET!,
  baseUrl: 'https://myapp.com/auth/magic',
  expiresIn: 15 * 60 * 1000,
});

// Later, verify:
const result = verifyMagicLinkToken(token, process.env.MAGIC_LINK_SECRET!);
if (result.valid) {
  console.log('Verified for:', result.email);
}
```

### TOTP / 2FA

```typescript
import { generateTOTPSecret, verifyTOTPCode } from '@auth-hub/core';

// Setup
const setup = await generateTOTPSecret({
  issuer: 'MyApp',
  accountName: 'user@example.com',
});
// setup.secret, setup.qrCodeUrl, setup.backupCodes

// Verify user's code
const isValid = verifyTOTPCode('123456', setup.secret);
```

### Rate Limiting

```typescript
import { RateLimiter } from '@auth-hub/core';

const limiter = new RateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 });

const { allowed, info } = limiter.check('user-ip-or-email');
if (!allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${info.retryAfter}s`);
}
```

### Error Handling

```typescript
import { Errors, isAuthHubError } from '@auth-hub/core';

try {
  // ...
} catch (error) {
  if (isAuthHubError(error)) {
    console.log(error.code, error.statusCode);
  }
}

// Create specific errors
throw Errors.invalidCredentials();
throw Errors.rateLimitExceeded(30);
throw Errors.mfaRequired('mfa-session-token');
```

## License

MIT
