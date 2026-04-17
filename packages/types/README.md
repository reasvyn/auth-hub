# @reasvyn/auth-types

Shared TypeScript type definitions for the Auth-Hub ecosystem.

## Installation

```bash
npm install @reasvyn/auth-types
```

## Usage

```typescript
import type {
  User,
  UserProfile,
  LoginCredentials,
  AuthResponse,
  Session,
  JWTPayload,
  OAuthProvider,
  AuthError,
  ErrorCode,
} from '@reasvyn/auth-types';
```

## Types Overview

### User Types
- `User` - Core user object
- `UserProfile` - Extended profile information
- `UserSettings` - User preferences and settings
- `UserRole` - `'user' | 'admin' | 'super_admin'`
- `UserStatus` - `'active' | 'inactive' | 'banned' | 'pending_verification'`

### Authentication Types
- `LoginCredentials` - Email/password login input
- `RegisterCredentials` - Registration input
- `AuthResponse` - Authentication result
- `MagicLinkRequest` - Magic link email request
- `OAuthLoginRequest` - OAuth2 callback data
- `MFAVerifyRequest` - MFA code verification

### Session Types
- `Session` - Full session object
- `SessionDevice` - Device information for session
- `SessionData` - Session payload data
- `ActiveSession` - Active session list item

### Token Types
- `JWTPayload` - JWT token payload structure
- `TokenMetadata` - Token storage metadata
- `TokenPair` - Access + refresh token pair
- `TokenType` - Token type union

### OAuth Types
- `OAuthProvider` - Supported provider names
- `OAuthConfig` - Provider configuration
- `OAuthAccount` - Linked OAuth account
- `OAuthTokens` - OAuth token response
- `OAuthUserProfile` - Provider user profile

### Error Types
- `ErrorCode` - Enum of all error codes
- `AuthError` - Structured auth error
- `ValidationError` - Field-level validation error

### API Types
- `ApiResponse<T>` - Standard API response wrapper
- `ApiError` - API error structure
- `PaginatedResponse<T>` - Paginated list response
- `ApiRequestConfig` - Client configuration

### Security Types
- `MFASetupData` - MFA enrollment data
- `DeviceInfo` - Device fingerprint data
- `RateLimitInfo` - Rate limit headers
- `CSRFToken` - CSRF token
- `SecurityEvent` - Security audit event
- `AnomalyScore` - Anomaly detection result

## License

MIT
