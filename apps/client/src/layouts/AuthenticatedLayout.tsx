import { NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
  IconBox,
  IconCart,
  IconIdCard,
  IconLayers,
  IconReceipt,
  IconStamp,
  IconTag,
  IconUsers,
} from '../components/icons';
import { useAuth } from '../hooks/useAuth';

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/products', label: 'Productos', Icon: IconBox },
    { to: '/inventory', label: 'Inventario', Icon: IconLayers },
    ...(user?.role !== 'auditor'
      ? [
          // POS first — confirmed with the human as this store's primary
          // sale flow (most sales are counter sales), ahead of the full
          // invoice form.
          { to: '/invoicing/pos-invoices', label: 'Venta POS', Icon: IconCart },
          { to: '/invoicing/invoices', label: 'Facturas', Icon: IconReceipt },
        ]
      : []),
    ...(user?.role === 'admin'
      ? [
          { to: '/users', label: 'Usuarios', Icon: IconUsers },
          { to: '/catalogs', label: 'Catálogos', Icon: IconTag },
          { to: '/invoicing/resolutions', label: 'Resoluciones DIAN', Icon: IconStamp },
          { to: '/invoicing/payroll-entries', label: 'Nómina electrónica', Icon: IconIdCard },
        ]
      : []),
  ];

  const roleLabel =
    user?.role === 'admin' ? 'Administrador' : user?.role === 'auditor' ? 'Auditor' : 'Empleado';

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <img src={logo} alt="La Casa de los Repuestos" className="h-8 w-auto" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-2 py-2.5 pl-3 pr-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-signal bg-white/5 text-white'
                    : 'border-transparent text-fog hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {user && (
            <p className="mb-2 text-sm text-white/90">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              <br />
              <span className="text-xs uppercase tracking-wide text-fog">{roleLabel}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-10 w-full rounded-sm px-3 py-2 text-left text-sm font-medium text-fog hover:bg-white/5 hover:text-white active:bg-white/10"
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="overflow-hidden rounded-sm bg-ink px-2 py-1.5">
              <img src={logo} alt="La Casa de los Repuestos" className="h-6 w-auto" />
            </div>
            {user && (
              <p className="text-xs text-fog">
                {user.firstName} {user.lastName} · {roleLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-10 min-w-10 rounded-sm px-3 py-2 text-sm font-medium text-steel hover:bg-mist active:bg-line"
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
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex overflow-x-auto border-t border-white/10 bg-ink lg:hidden">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[72px] flex-none flex-col items-center gap-0.5 whitespace-nowrap border-t-2 px-2 py-2 text-xs font-medium ${
                  isActive ? 'border-signal text-white' : 'border-transparent text-fog'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
