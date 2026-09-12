import { Link } from 'react-router-dom';
import type { UserResponse } from '../services/users';
import { Button } from './Button';

interface UserCardProps {
  user: UserResponse;
  isSelf: boolean;
  onToggleActive: (user: UserResponse) => void;
  isTogglingActive: boolean;
  onDelete: (user: UserResponse) => void;
  isDeleting: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function UserCard({
  user,
  isSelf,
  onToggleActive,
  isTogglingActive,
  onDelete,
  isDeleting,
}: UserCardProps) {
  return (
    <div className="flex h-full flex-col rounded border border-line bg-white p-4 transition-colors hover:border-fog">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-sm text-steel">{user.email}</p>
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide ${
            user.role === 'admin'
              ? 'border-ink/20 bg-ink/5 text-ink'
              : 'border-line bg-canvas text-steel'
          }`}
        >
          {user.role === 'admin' ? 'Admin' : 'Empleado'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-steel">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Estado</dt>
          <dd>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                user.isActive ? 'text-ok' : 'text-rust'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  user.isActive ? 'bg-ok' : 'bg-rust'
                }`}
                aria-hidden="true"
              />
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Último acceso</dt>
          <dd className="truncate">
            {user.lastLoginAt ? dateFormatter.format(new Date(user.lastLoginAt)) : 'Nunca'}
          </dd>
        </div>
      </dl>

      {isSelf && (
        <p className="mt-3 text-xs text-fog">
          Esta es tu cuenta. No puedes desactivarla ni eliminarla.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 sm:mt-auto sm:pt-4">
        <Link to={`/users/${user.id}/edit`} className="flex-1">
          <Button variant="secondary" type="button" className="w-full">
            Editar
          </Button>
        </Link>
        <Button
          variant="secondary"
          type="button"
          className="flex-1"
          disabled={isSelf}
          isLoading={isTogglingActive}
          onClick={() => onToggleActive(user)}
        >
          {user.isActive ? 'Desactivar' : 'Activar'}
        </Button>
        <Button
          variant="danger"
          type="button"
          className="flex-1"
          disabled={isSelf}
          isLoading={isDeleting}
          onClick={() => onDelete(user)}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
