import type React from 'react';
import { usePermissions } from './usePermissions';
import type { Permission } from '../types';

export interface CanProps {
  /** Permission required to render children */
  permission?: Permission;
  /** Render if user has ANY of these permissions */
  anyOf?: Permission[];
  /** Render if user has ALL of these permissions */
  allOf?: Permission[];
  /** Fallback to render when access is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditional render component based on RBAC permissions.
 *
 * @example
 * <Can permission="posts:delete">
 *   <DeleteButton />
 * </Can>
 *
 * <Can anyOf={['posts:update', 'posts:delete']} fallback={<span>No access</span>}>
 *   <EditMenu />
 * </Can>
 */
export function Can({ permission, anyOf, allOf, fallback = null, children }: CanProps): React.ReactNode {
  const { can, canAny, canAll } = usePermissions();

  let granted = false;
  if (permission) {
    granted = can(permission);
  } else if (anyOf) {
    granted = canAny(anyOf);
  } else if (allOf) {
    granted = canAll(allOf);
  }

  return granted ? children : fallback;
}
