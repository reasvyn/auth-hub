import { useContext } from 'react';
import { RBACContext } from './RBACContext';
import type { RBACContextValue } from './RBACContext';

/**
 * Access the RBAC context. Must be used inside <RBACProvider>.
 *
 * @example
 * function PostActions() {
 *   const { can } = usePermissions();
 *   return (
 *     <div>
 *       {can('posts:update') && <button>Edit</button>}
 *       {can('posts:delete') && <button>Delete</button>}
 *     </div>
 *   );
 * }
 */
export function usePermissions(): RBACContextValue {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    throw new Error('[auth-rbac] usePermissions must be used inside <RBACProvider>');
  }
  return ctx;
}
