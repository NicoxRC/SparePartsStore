import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/products', label: 'Productos', icon: '📦' },
];

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div>
          <p className="text-sm font-bold text-gray-900">CasaRespuestos</p>
          {user && (
            <p className="text-xs text-gray-500">
              {user.firstName} {user.lastName} · {user.role === 'admin' ? 'Admin' : 'Empleado'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-10 min-w-10 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-gray-200 bg-white">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
