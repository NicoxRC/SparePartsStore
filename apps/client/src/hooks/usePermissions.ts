import type { PermissionCode } from '../lib/permissions';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  const has = (code: PermissionCode): boolean =>
    user?.role === 'admin' || (user?.permissions.includes(code) ?? false);

  return { has };
}
