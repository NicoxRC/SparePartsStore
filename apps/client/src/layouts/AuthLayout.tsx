import { Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F4] px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 max-w-xs overflow-hidden rounded-2xl bg-black p-4 shadow-sm sm:max-w-sm">
            <img src={logo} alt="La Casa de los Repuestos" className="w-full" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#E8853A]">
            Inventario de repuestos
          </p>
          <p className="mt-1 text-sm text-[#8B92A3]">
            Acceso para personal de tienda
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4E8EF] bg-white p-6 shadow-sm sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
