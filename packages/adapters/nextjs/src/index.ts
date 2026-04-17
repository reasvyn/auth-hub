// Server-side exports
export { getServerSession, verifyAccessToken, withAuth } from './server';
export type { AuthSession, GetServerSessionOptions, WithAuthOptions } from './server';

// Middleware
export { createAuthMiddleware } from './middleware';
export type { NextAuthMiddlewareOptions } from './middleware';

// Re-export react components for convenience
export {
  AuthProvider,
  AuthContext,
  useAuth,
  useUser,
  useMFA,
  useSession,
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ChangePasswordForm,
  MFASetupForm,
  MFAVerifyForm,
  UserProfile,
  SessionsList,
  OAuthButton,
  PasswordStrengthIndicator,
} from '@reasvyn/auth-react';
export type { AuthAdapter, AuthProviderProps } from '@reasvyn/auth-react';
