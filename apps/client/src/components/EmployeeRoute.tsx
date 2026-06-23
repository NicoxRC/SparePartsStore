import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './Spinner';

export function EmployeeRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Verificando sesión…" />
      </div>
    );
  }

  if (user?.role === 'auditor') {
    return <Navigate to="/products" replace />;
  }

  return <Outlet />;
}
