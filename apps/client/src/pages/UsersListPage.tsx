import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { UserCard } from '../components/UserCard';
import { useAuth } from '../hooks/useAuth';
import { useDeleteUser, useToggleUserActive, useUsers } from '../hooks/useUsers';
import { getApiErrorMessage } from '../lib/errors';
import type { UserResponse, UsersQuery } from '../services/users';

const PAGE_SIZE = 20;

interface FiltersState {
  page: number;
  limit: number;
  search: string;
  role: '' | 'admin' | 'employee';
  isActive: '' | 'true' | 'false';
}

export function UsersListPage() {
  const { user: currentUser } = useAuth();

  const [filters, setFilters] = useState<FiltersState>({
    page: 1,
    limit: PAGE_SIZE,
    search: '',
    role: '',
    isActive: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<UserResponse | null>(null);

  const query: UsersQuery = {
    page: filters.page,
    limit: filters.limit,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.isActive ? { isActive: filters.isActive === 'true' } : {}),
  };

  const usersQuery = useUsers(query);
  const deleteMutation = useDeleteUser();
  const toggleActiveMutation = useToggleUserActive();

  const updateFilter = (patch: Partial<FiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const handleDeleteRequest = (user: UserResponse) => {
    setUserPendingDelete(user);
  };

  const confirmDelete = async () => {
    if (!userPendingDelete) return;
    await deleteMutation.mutateAsync(userPendingDelete.id);
    setUserPendingDelete(null);
  };

  const handleToggleActive = (user: UserResponse) => {
    toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
          Usuarios
        </h1>
        <Link to="/users/new" className="shrink-0">
          <Button type="button">+ Nuevo</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="sm:flex-1">
            <TextField
              label="Buscar"
              placeholder="Correo, nombre o apellido"
              value={filters.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="self-start text-sm font-medium text-[#1E2A4A] underline decoration-[#D8DCE6] underline-offset-4 hover:decoration-[#1E2A4A] sm:mb-2.5 sm:self-auto"
          >
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-[#E4E8EF] bg-white p-3 sm:grid-cols-2 sm:gap-3 sm:p-4">
            <SelectField
              label="Rol"
              id="filter-role"
              name="filter-role"
              value={filters.role}
              onChange={(e) =>
                updateFilter({ role: e.target.value as FiltersState['role'] })
              }
            >
              <option value="">Todos</option>
              <option value="admin">Administrador</option>
              <option value="employee">Empleado</option>
            </SelectField>
            <SelectField
              label="Estado"
              id="filter-isActive"
              name="filter-isActive"
              value={filters.isActive}
              onChange={(e) =>
                updateFilter({ isActive: e.target.value as FiltersState['isActive'] })
              }
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </SelectField>
          </div>
        )}
      </div>

      {deleteMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
      )}

      {toggleActiveMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(toggleActiveMutation.error)}</Alert>
      )}

      {usersQuery.isPending && <Spinner label="Cargando usuarios…" />}

      {usersQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(usersQuery.error)}</Alert>
      )}

      {usersQuery.isSuccess && (
        <>
          {usersQuery.data.data.length === 0 ? (
            <Alert variant="info">No se encontraron usuarios.</Alert>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {usersQuery.data.data.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUser?.id}
                  onToggleActive={handleToggleActive}
                  isTogglingActive={
                    toggleActiveMutation.isPending &&
                    toggleActiveMutation.variables?.id === user.id
                  }
                  onDelete={handleDeleteRequest}
                  isDeleting={
                    deleteMutation.isPending && deleteMutation.variables === user.id
                  }
                />
              ))}
            </div>
          )}

          <Pagination
            meta={usersQuery.data.meta}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        </>
      )}

      {userPendingDelete && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-[#1E2A4A]">Eliminar usuario</h2>
            <p className="mt-2 text-sm text-[#3F4654]">
              ¿Seguro que deseas eliminar a{' '}
              <span className="font-medium">
                {userPendingDelete.firstName} {userPendingDelete.lastName}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setUserPendingDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                type="button"
                isLoading={deleteMutation.isPending}
                onClick={() => void confirmDelete()}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
