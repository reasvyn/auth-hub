// Context & Provider
export { AuthContext } from './context/AuthContext';
export { AuthProvider } from './context/AuthProvider';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useSession } from './hooks/useSession';
export { useMFA } from './hooks/useMFA';
export { useUser } from './hooks/useUser';

// Components
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ChangePasswordForm } from './components/ChangePasswordForm';
export { MFASetupForm } from './components/MFASetupForm';
export { MFAVerifyForm } from './components/MFAVerifyForm';
export { UserProfile } from './components/UserProfile';
export { SessionsList } from './components/SessionsList';
export { OAuthButton } from './components/OAuthButton';
export { PasswordStrengthIndicator } from './components/PasswordStrengthIndicator';

// Primitives (for custom composition)
export {
  Card,
  Heading,
  Subheading,
  ErrorAlert,
  SuccessAlert,
  Label,
  Input,
  Button,
  Spinner,
  TextButton,
  Divider,
  Field,
} from './components/ui';

// Types
export type {
  AuthAdapter,
  AuthState,
  AuthStatus,
  AuthContextValue,
  AuthProviderProps,
  LoginFormProps,
  RegisterFormProps,
  ForgotPasswordFormProps,
  ChangePasswordFormProps,
  MFASetupFormProps,
  MFAVerifyFormProps,
  UserProfileProps,
  SessionsListProps,
  OAuthButtonProps,
  PasswordStrengthIndicatorProps,
} from './types';
