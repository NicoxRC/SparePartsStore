import { NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
  IconBox,
  IconCart,
  IconCashRegister,
  IconContact,
  IconDashboard,
  IconIdCard,
  IconInbox,
  IconLayers,
  IconReceipt,
  IconStamp,
  IconTag,
  IconUsers,
} from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const { has } = usePermissions();
  const isAdmin = user?.role === 'admin';
  const isAuditor = user?.role === 'auditor';

  const navItems = [
    ...(isAdmin ? [{ to: '/dashboard', label: 'Panel', Icon: IconDashboard }] : []),
    // Productos/Inventario predate this permission system as unrestricted
    // views for any authenticated role — auditor keeps that fixed access
    // here, unrelated to the employee permission grant.
    ...(isAuditor || has('products.view')
      ? [{ to: '/products', label: 'Productos', Icon: IconBox }]
      : []),
    ...(isAuditor || has('inventory.view')
      ? [{ to: '/inventory', label: 'Inventario', Icon: IconLayers }]
      : []),
    ...(!isAuditor && has('invoices.create')
      ? [{ to: '/ventas', label: 'Venta', Icon: IconCart }]
      : []),
    ...(!isAuditor && has('quotations.view')
      ? [{ to: '/cotizaciones', label: 'Cotizaciones', Icon: IconIdCard }]
      : []),
    ...(!isAuditor && has('invoices.view')
      ? [{ to: '/invoicing/invoices', label: 'Facturas', Icon: IconReceipt }]
      : []),
    ...(!isAuditor && has('purchase_imports.view')
      ? [{ to: '/compras', label: 'Compras', Icon: IconInbox }]
      : []),
    ...(!isAuditor && has('customers.view')
      ? [{ to: '/customers', label: 'Clientes', Icon: IconContact }]
      : []),
    ...(isAdmin
      ? [
          { to: '/users', label: 'Usuarios', Icon: IconUsers },
          { to: '/catalogs', label: 'Catálogos', Icon: IconTag },
          { to: '/invoicing/resolutions', label: 'Resoluciones DIAN', Icon: IconStamp },
          // Nómina electrónica: not removed, just off the nav — not in use
          // for now but expected back later. Route/page/backend stay intact
          // at /invoicing/payroll-entries; restoring access is just adding
          // this entry back.
        ]
      : []),
    // "Caja" was previously hardcoded admin-only here even though the
    // backend already allowed employee access — now it follows the same
    // permission an employee can be granted, same as every other item.
    ...(isAdmin || has('cash_register.view')
      ? [{ to: '/cash-register/history', label: 'Caja', Icon: IconCashRegister }]
      : []),
  ];

  const roleLabel =
    user?.role === 'admin' ? 'Administrador' : user?.role === 'auditor' ? 'Auditor' : 'Empleado';

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="relative hidden w-60 shrink-0 flex-col bg-spine lg:flex">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-10 flex-1 px-3 py-2 text-left text-sm font-medium text-fog hover:bg-white/5 hover:text-white active:bg-white/10"
            >
              Salir
            </button>
            <ThemeToggle className="flex min-h-10 min-w-10 items-center justify-center text-fog hover:bg-white/5 hover:text-white active:bg-white/10" />
          </div>
        </div>
        {/* The ledger's own binding — a punched seam where the cover meets the pages. */}
        <div
          aria-hidden="true"
          className="perforated-divider-vertical absolute inset-y-0 right-0"
        />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-paper px-4 lg:hidden relative">
          <div className="perforated-divider absolute inset-x-0 bottom-0" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <div className="overflow-hidden rounded-sm bg-spine px-2 py-1.5">
              <img src={logo} alt="La Casa de los Repuestos" className="h-6 w-auto" />
            </div>
            {user && (
              <p className="text-xs text-fog">
                {user.firstName} {user.lastName} · {roleLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="flex min-h-10 min-w-10 items-center justify-center rounded-sm text-steel hover:bg-mist active:bg-line" />
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-10 min-w-10 rounded-sm px-3 py-2 text-sm font-medium text-steel hover:bg-mist active:bg-line"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 pb-20 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex overflow-x-auto border-t border-white/10 bg-spine lg:hidden">
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
