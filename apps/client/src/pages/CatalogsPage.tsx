import { Link } from 'react-router-dom';
import { IconFolder, IconStore, IconTag } from '../components/icons';

const catalogs = [
  {
    to: '/departments',
    title: 'Departamentos',
    description: 'Administra los departamentos de productos.',
    Icon: IconStore,
  },
  {
    to: '/groups',
    title: 'Grupos',
    description: 'Administra los grupos de productos.',
    Icon: IconFolder,
  },
  {
    to: '/brands',
    title: 'Marcas',
    description: 'Administra las marcas de productos.',
    Icon: IconTag,
  },
];

export function CatalogsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Catálogos
      </h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalogs.map(({ to, title, description, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded border border-line bg-white p-4 transition-colors hover:border-fog"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-canvas text-ink">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink">{title}</p>
              <p className="truncate text-sm text-fog">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
