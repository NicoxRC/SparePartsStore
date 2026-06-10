import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">CasaRespuestos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistema de inventario de repuestos
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
