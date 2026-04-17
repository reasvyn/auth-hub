import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  OAuthProvider,
  ActiveSession,
  MFASetupData,
  TwoFactorMethod,
} from '@reasvyn/auth-types';

// ----- Adapter -----

export interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(refreshToken?: string): Promise<void>;
  refreshToken(token: string): Promise<AuthResponse>;
  getUser(): Promise<User | null>;
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
  getSessions?(): Promise<ActiveSession[]>;
  revokeSession?(sessionId: string): Promise<void>;
  revokeAllSessions?(): Promise<void>;
}

// ----- Auth State -----

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  accessToken: string | null;
  error: string | null;
}

// ----- Context Value -----

export interface AuthContextValue extends AuthState {
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

// ----- Provider Props -----

export interface AuthProviderProps {
  adapter: AuthAdapter;
  children: React.ReactNode;
  onLogin?: (user: User) => void;
  onLogout?: () => void;
  onError?: (error: string) => void;
  /** Auto-refresh access token (milliseconds before expiry). Default: 60000 */
  refreshBeforeExpiry?: number;
}

// ----- Component Props -----

export interface LoginFormProps {
  onSuccess?: (response?: AuthResponse) => void;
  onError?: (error: string) => void;
  providers?: OAuthProvider[];
  enableMagicLink?: boolean;
  redirectTo?: string;
  className?: string;
}

export interface RegisterFormProps {
  onSuccess?: (response?: AuthResponse) => void;
  onError?: (error: string) => void;
  providers?: OAuthProvider[];
  redirectTo?: string;
  className?: string;
}

export interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onBack?: () => void;
  className?: string;
}

export interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface MFASetupFormProps {
  method: TwoFactorMethod;
  setupData?: MFASetupData | null;
  onVerify?: (code: string) => Promise<MFASetupData | void> | MFASetupData | void;
  onSuccess?: (data?: MFASetupData) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

export interface MFAVerifyFormProps {
  method?: TwoFactorMethod;
  onVerify?: (code: string, method: TwoFactorMethod) => Promise<AuthResponse | void> | AuthResponse | void;
  onSuccess?: (response?: AuthResponse) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
  className?: string;
}

export interface UserProfileProps {
  onUpdate?: (user: User) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface SessionsListProps {
  onRevoke?: (sessionId: string) => void;
  onRevokeAll?: () => void;
  className?: string;
}

export interface OAuthButtonProps {
  provider: OAuthProvider;
  onClick?: () => void;
  className?: string;
  label?: string;
}

export interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}
