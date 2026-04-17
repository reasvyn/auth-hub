import { createContext } from 'react';
import type { RBACEngine } from '../engine';
import type { Permission } from '../types';

export interface RBACContextValue {
  /** The initialized RBACEngine */
  rbac: RBACEngine;
  /** Current user's role. Null when unauthenticated. */
  role: string | null;
  /** Check a permission for the current role */
  can(permission: Permission): boolean;
  /** Check if current role has any of the permissions */
  canAny(permissions: Permission[]): boolean;
  /** Check if current role has all of the permissions */
  canAll(permissions: Permission[]): boolean;
}

export const RBACContext = createContext<RBACContextValue | null>(null);
