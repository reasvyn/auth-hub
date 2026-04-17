import React, { useMemo } from 'react';

import type { RBACEngine } from '../engine';
import type { Permission } from '../types';

import { RBACContext } from './RBACContext';

export interface RBACProviderProps {
  /** The initialized RBACEngine */
  rbac: RBACEngine;
  /** Current user's role — pass null when unauthenticated */
  role: string | null;
  children: React.ReactNode;
}

/**
 * Provides RBAC context to the component tree.
 *
 * @example
 * import { RBACProvider } from '@reasvyn/auth-rbac/react';
 *
 * const rbac = defineRoles()
 *   .role('admin', { permissions: ['*'] })
 *   .role('user', { permissions: ['posts:read'] })
 *   .build();
 *
 * function App() {
 *   const { user } = useAuth();
 *   return (
 *     <RBACProvider rbac={rbac} role={user?.role ?? null}>
 *       <Dashboard />
 *     </RBACProvider>
 *   );
 * }
 */
export function RBACProvider({ rbac, role, children }: RBACProviderProps) {
  const value = useMemo(
    () => ({
      rbac,
      role,
      can: (permission: Permission) => (role ? rbac.can(role).do(permission) : false),
      canAny: (permissions: Permission[]) => (role ? rbac.can(role).doAny(permissions) : false),
      canAll: (permissions: Permission[]) => (role ? rbac.can(role).doAll(permissions) : false),
    }),
    [rbac, role],
  );

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
}
