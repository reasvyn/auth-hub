import type {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  OAuthProvider,
  RegisterCredentials,
  User,
  UserRole,
} from '@reasvyn/auth-types';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AuthState, AuthProviderProps } from '../types';

import { AuthContext } from './AuthContext';

type TokenBearingAuthResponse = AuthResponse & {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

function isUser(value: User | AuthUser): value is User {
  return 'createdAt' in value && 'updatedAt' in value && 'status' in value;
}

function normalizeRole(role: string): UserRole {
  if (role === 'admin' || role === 'super_admin') {
    return role;
  }
  return 'user';
}

function normalizeUser(user: User | AuthUser): User {
  if (isUser(user)) {
    return user;
  }

  const now = new Date();
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: now,
    updatedAt: now,
    role: normalizeRole(user.role),
    status: 'active',
    profile: {
      userId: user.id,
      ...(user.displayName !== undefined ? { displayName: user.displayName } : {}),
      ...(user.avatarUrl !== undefined ? { avatarUrl: user.avatarUrl } : {}),
    },
    settings: {
      userId: user.id,
      twoFactorEnabled: false,
    },
  };
}

function extractSessionState(response: AuthResponse): {
  accessToken: string | null;
  refreshToken: string | null;
  expiresInMs: number | null;
} {
  const legacy = response as TokenBearingAuthResponse;
  const accessToken = legacy.accessToken ?? response.session?.accessToken ?? null;
  const refreshToken = legacy.refreshToken ?? response.session?.refreshToken ?? null;

  let expiresInMs: number | null = null;
  if (legacy.expiresIn !== undefined) {
    expiresInMs = legacy.expiresIn * 1000;
  } else if (response.session?.expiresAt) {
    expiresInMs = Math.max(new Date(response.session.expiresAt).getTime() - Date.now(), 0);
  }

  return { accessToken, refreshToken, expiresInMs };
}

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_USER'; user: User; accessToken: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'loading', error: null };
    case 'SET_USER':
      return {
        ...state,
        status: 'authenticated',
        user: action.user,
        accessToken: action.accessToken,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, status: 'unauthenticated', error: action.error };
    case 'LOGOUT':
      return { user: null, status: 'unauthenticated', accessToken: null, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  status: 'loading',
  accessToken: null,
  error: null,
};

export function AuthProvider({
  adapter,
  children,
  onLogin,
  onLogout,
  onError,
  refreshBeforeExpiry = 60_000,
}: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      clearRefreshTimer();
      const delay = Math.max(expiresIn - refreshBeforeExpiry, 5_000);
      refreshTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const stored =
              typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;
            if (!stored) return;
            const response = await adapter.refreshToken(stored);
            const session = extractSessionState(response);
            if (response.user && session.accessToken) {
              dispatch({
                type: 'SET_USER',
                user: normalizeUser(response.user),
                accessToken: session.accessToken,
              });
              if (session.refreshToken) {
                localStorage.setItem('auth_refresh_token', session.refreshToken);
              }
              if (session.expiresInMs) scheduleRefresh(session.expiresInMs);
            }
          } catch {
            dispatch({ type: 'LOGOUT' });
            localStorage.removeItem('auth_refresh_token');
          }
        })();
      }, delay);
    },
    [adapter, clearRefreshTimer, refreshBeforeExpiry],
  );

  // Initialize: try to restore session
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const refreshToken =
          typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;
        if (refreshToken) {
          const response = await adapter.refreshToken(refreshToken);
          const session = extractSessionState(response);
          if (cancelled) return;
          if (response.user && session.accessToken) {
            dispatch({
              type: 'SET_USER',
              user: normalizeUser(response.user),
              accessToken: session.accessToken,
            });
            if (session.refreshToken) {
              localStorage.setItem('auth_refresh_token', session.refreshToken);
            }
            if (session.expiresInMs) scheduleRefresh(session.expiresInMs);
            return;
          }
        }
        // Try getUser as fallback
        const user = await adapter.getUser();
        if (cancelled) return;
        if (user) {
          dispatch({ type: 'SET_USER', user, accessToken: '' });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'LOGOUT' });
      }
    }
    void init();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [adapter, scheduleRefresh, clearRefreshTimer]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch({ type: 'SET_LOADING' });
      try {
        const response = await adapter.login(credentials);
        const session = extractSessionState(response);
        if (!response.user || !session.accessToken) throw new Error('Invalid response from login');
        const user = normalizeUser(response.user);
        dispatch({ type: 'SET_USER', user, accessToken: session.accessToken });
        if (session.refreshToken) {
          localStorage.setItem('auth_refresh_token', session.refreshToken);
        }
        if (session.expiresInMs) scheduleRefresh(session.expiresInMs);
        onLogin?.(user);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        dispatch({ type: 'SET_ERROR', error: message });
        onError?.(message);
      }
    },
    [adapter, scheduleRefresh, onLogin, onError],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      dispatch({ type: 'SET_LOADING' });
      try {
        const response = await adapter.register(credentials);
        const session = extractSessionState(response);
        if (!response.user || !session.accessToken)
          throw new Error('Invalid response from register');
        const user = normalizeUser(response.user);
        dispatch({ type: 'SET_USER', user, accessToken: session.accessToken });
        if (session.refreshToken) {
          localStorage.setItem('auth_refresh_token', session.refreshToken);
        }
        if (session.expiresInMs) scheduleRefresh(session.expiresInMs);
        onLogin?.(user);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        dispatch({ type: 'SET_ERROR', error: message });
        onError?.(message);
      }
    },
    [adapter, scheduleRefresh, onLogin, onError],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;
    try {
      await adapter.logout(refreshToken ?? undefined);
    } finally {
      localStorage.removeItem('auth_refresh_token');
      dispatch({ type: 'LOGOUT' });
      onLogout?.();
    }
  }, [adapter, clearRefreshTimer, onLogout]);

  const loginWithOAuth = useCallback(
    async (provider: OAuthProvider) => {
      if (!adapter.loginWithOAuth) throw new Error('OAuth not configured in adapter');
      await adapter.loginWithOAuth(provider);
    },
    [adapter],
  );

  const sendMagicLink = useCallback(
    async (email: string) => {
      if (!adapter.sendMagicLink) throw new Error('Magic link not configured in adapter');
      await adapter.sendMagicLink(email);
    },
    [adapter],
  );

  const sendEmailVerification = useCallback(async () => {
    if (!adapter.sendEmailVerification)
      throw new Error('Email verification not configured in adapter');
    await adapter.sendEmailVerification();
  }, [adapter]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!adapter.requestPasswordReset)
        throw new Error('Password reset not configured in adapter');
      await adapter.requestPasswordReset(email);
    },
    [adapter],
  );

  const confirmPasswordReset = useCallback(
    async (token: string, newPassword: string) => {
      if (!adapter.confirmPasswordReset)
        throw new Error('Password reset not configured in adapter');
      await adapter.confirmPasswordReset(token, newPassword);
    },
    [adapter],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!adapter.changePassword) throw new Error('Change password not configured in adapter');
      await adapter.changePassword(currentPassword, newPassword);
    },
    [adapter],
  );

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        loginWithOAuth,
        sendMagicLink,
        sendEmailVerification,
        requestPasswordReset,
        confirmPasswordReset,
        changePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
