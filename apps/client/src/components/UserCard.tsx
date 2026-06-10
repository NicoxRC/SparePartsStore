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
    <div className="flex h-full flex-col rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#1E2A4A]">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-sm text-[#3F4654]">{user.email}</p>
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide ${
            user.role === 'admin'
              ? 'border-[#1E2A4A]/20 bg-[#1E2A4A]/5 text-[#1E2A4A]'
              : 'border-[#D8DCE6] bg-[#F7F6F4] text-[#3F4654]'
          }`}
        >
          {user.role === 'admin' ? 'Admin' : 'Empleado'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-[#3F4654]">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Estado</dt>
          <dd>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                user.isActive ? 'text-[#2F6B45]' : 'text-[#C2483A]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  user.isActive ? 'bg-[#2F6B45]' : 'bg-[#C2483A]'
                }`}
                aria-hidden="true"
              />
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Último acceso</dt>
          <dd className="truncate">
            {user.lastLoginAt ? dateFormatter.format(new Date(user.lastLoginAt)) : 'Nunca'}
          </dd>
        </div>
      </dl>

      {isSelf && (
        <p className="mt-3 text-xs text-[#8B92A3]">
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
