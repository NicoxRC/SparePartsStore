import { Link } from 'react-router-dom';

const catalogs = [
  {
    to: '/departments',
    title: 'Departamentos',
    description: 'Administra los departamentos de productos.',
    icon: '🏬',
  },
  {
    to: '/groups',
    title: 'Grupos',
    description: 'Administra los grupos de productos.',
    icon: '🗂️',
  },
  {
    to: '/brands',
    title: 'Marcas',
    description: 'Administra las marcas de productos.',
    icon: '🏷️',
  },
];

export function CatalogsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        Catálogos
      </h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalogs.map((catalog) => (
          <Link
            key={catalog.to}
            to={catalog.to}
            className="flex items-center gap-4 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="text-3xl" aria-hidden="true">
              {catalog.icon}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1E2A4A]">{catalog.title}</p>
              <p className="truncate text-sm text-[#8B92A3]">{catalog.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
