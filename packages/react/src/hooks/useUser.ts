import { useCallback, useState } from 'react';
import type { User } from '@reasvyn/auth-types';
import { useAuth } from './useAuth';

interface UseUserReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole(role: User['role']): boolean;
  hasPermission(permission: string): boolean;
  isEmailVerified(): boolean;
  isMFAEnabled(): boolean;
  displayName(): string;
  avatarUrl(): string | null;
}

export function useUser(): UseUserReturn {
  const { user, status } = useAuth();

  const hasRole = useCallback(
    (role: User['role']) => user?.role === role,
    [user],
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      return false; // Extend with actual permissions array from user object
    },
    [user],
  );

  const isEmailVerified = useCallback(() => user?.isEmailVerified ?? false, [user]);

  const isMFAEnabled = useCallback(() => user?.isMFAEnabled ?? false, [user]);

  const displayName = useCallback(() => {
    if (!user) return '';
    return user.name ?? user.email ?? '';
  }, [user]);

  const avatarUrl = useCallback(() => user?.avatarUrl ?? null, [user]);

  return {
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    hasRole,
    hasPermission,
    isEmailVerified,
    isMFAEnabled,
    displayName,
    avatarUrl,
  };
}

// Simple form state hook used by components internally
export function useFormState<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
    setSubmitting(false);
  }, [initial]);

  return { values, errors, setErrors, submitting, setSubmitting, handleChange, reset };
}
