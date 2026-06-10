import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/products', label: 'Productos', icon: '📦' },
];

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F4] lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E4E8EF] bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-[#E4E8EF] px-6">
          <div>
            <p className="text-sm font-bold tracking-tight text-[#1E2A4A]">CasaRespuestos</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8B92A3]">
              Inventario
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1E2A4A] text-white'
                    : 'text-[#3F4654] hover:bg-[#F0F2F6]'
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

        <div className="border-t border-[#E4E8EF] p-4">
          {user && (
            <p className="mb-2 text-sm text-[#3F4654]">
              <span className="font-medium">{user.firstName} {user.lastName}</span>
              <br />
              <span className="text-xs text-[#8B92A3]">
                {user.role === 'admin' ? 'Administrador' : 'Empleado'}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#3F4654] hover:bg-[#F0F2F6] active:bg-[#E4E8EF]"
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#E4E8EF] bg-white px-4 lg:hidden">
          <div>
            <p className="text-sm font-bold tracking-tight text-[#1E2A4A]">CasaRespuestos</p>
            {user && (
              <p className="text-xs text-[#8B92A3]">
                {user.firstName} {user.lastName} · {user.role === 'admin' ? 'Admin' : 'Empleado'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-10 min-w-10 rounded-lg px-3 py-2 text-sm font-medium text-[#3F4654] hover:bg-[#F0F2F6] active:bg-[#E4E8EF]"
          >
            Salir
          </button>
        </header>

        <main className="flex-1 px-4 py-4 pb-20 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-[#E4E8EF] bg-white lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  isActive ? 'text-[#1E2A4A]' : 'text-[#8B92A3]'
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
    </div>
  );
}
