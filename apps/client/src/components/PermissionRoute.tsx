import { Navigate, Outlet } from 'react-router-dom';
import type { PermissionCode } from '../lib/permissions';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './Spinner';

interface PermissionRouteProps {
  permission: PermissionCode;
}

/**
 * Gates a route by a specific granular permission — admin always passes
 * (fixed superuser), auditor always passes (its existing read-only
 * access predates and is untouched by this system), only `employee` is
 * actually checked against its stored permissions. Route-level gating is
 * needed in addition to hiding the nav link — otherwise an employee
 * could still reach a page by typing the URL directly.
 */
export function PermissionRoute({ permission }: PermissionRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Verificando sesión…" />
      </div>
    );
  }

  const allowed =
    user?.role === 'admin' ||
    user?.role === 'auditor' ||
    (user?.permissions.includes(permission) ?? false);

  if (!allowed) {
    return <Navigate to="/products" replace />;
  }

  return <Outlet />;
}
