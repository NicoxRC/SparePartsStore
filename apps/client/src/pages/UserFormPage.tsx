import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { PermissionsEditor } from '../components/PermissionsEditor';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import {
  useCreateUser,
  useUpdateUser,
  useUpdateUserPermissions,
  useUser,
} from '../hooks/useUsers';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import type { PermissionCode } from '../lib/permissions';
import {
  userEditFormSchema,
  userFormSchema,
  type UserEditFormInput,
  type UserEditFormValues,
  type UserFormInput,
  type UserFormValues,
} from '../lib/schemas/user';

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const userQuery = useUser(id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id ?? '');
  const updatePermissionsMutation = useUpdateUserPermissions(id ?? '');

  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [syncedUserId, setSyncedUserId] = useState<string | undefined>(undefined);

  // Rehydrate the local permissions state whenever a different user's data
  // arrives, without an effect — same pattern AuthContext already uses for
  // "adjust state when the fetched data changes."
  if (userQuery.data && syncedUserId !== userQuery.data.id) {
    setPermissions(userQuery.data.permissions);
    setSyncedUserId(userQuery.data.id);
  }

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UserFormInput | UserEditFormInput, unknown, UserFormValues | UserEditFormValues>({
    resolver: zodResolver(isEditMode ? userEditFormSchema : userFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'employee',
      password: '',
    },
    values: userQuery.data
      ? {
          email: userQuery.data.email,
          firstName: userQuery.data.firstName,
          lastName: userQuery.data.lastName,
          role: userQuery.data.role,
          password: '',
        }
      : undefined,
  });

  const mutation = isEditMode ? updateMutation : createMutation;
  const watchedRole = useWatch({ control, name: 'role' });
  const isEmployee = watchedRole === 'employee';

  const onSubmit = async (values: UserFormValues | UserEditFormValues) => {
    if (isEditMode) {
      const { password, ...rest } = values;
      const payload = password ? { ...rest, password } : rest;
      await updateMutation.mutateAsync(payload);
      if (values.role === 'employee') {
        await updatePermissionsMutation.mutateAsync(permissions);
      }
    } else {
      await createMutation.mutateAsync({
        ...(values as UserFormValues),
        permissions: values.role === 'employee' ? permissions : undefined,
      });
      reset();
    }
    navigate('/users');
  };

  if (isEditMode && userQuery.isPending) {
    return <Spinner label="Cargando usuario…" />;
  }

  if (isEditMode && userQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(userQuery.error)}</Alert>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {isEditMode ? 'Editar usuario' : 'Nuevo usuario'}
      </h1>

      {mutation.isError && (
        <Alert variant="error">{getApiErrorMessage(mutation.error)}</Alert>
      )}
      {updatePermissionsMutation.isError && (
        <Alert variant="error">
          {getApiErrorMessage(updatePermissionsMutation.error)}
        </Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        onKeyDown={handleEnterAsTab}
        className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6"
        noValidate
      >
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="usuario@casarespuestos.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            placeholder="Nombre"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Apellido"
            placeholder="Apellido"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Rol" error={errors.role?.message} {...register('role')}>
            <option value="employee">Empleado</option>
            <option value="admin">Administrador</option>
            <option value="auditor">Auditor</option>
          </SelectField>

          <TextField
            label={isEditMode ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'}
            type="password"
            autoComplete="new-password"
            placeholder={isEditMode ? 'Dejar en blanco para no cambiar' : 'Ej: 1234'}
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <p className="text-sm text-fog">
          {isEditMode
            ? 'Si asignas una nueva contraseña, el usuario deberá cambiarla al iniciar sesión.'
            : 'Puedes asignar una contraseña simple. El usuario deberá cambiarla al iniciar sesión por primera vez.'}
        </p>

        {isEmployee && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
              Permisos
            </h2>
            <p className="text-sm text-steel">
              Qué puede ver y hacer este empleado. El administrador y el auditor no usan
              permisos — tienen acceso fijo.
            </p>
            <PermissionsEditor value={permissions} onChange={setPermissions} />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/users')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="sm:w-auto sm:px-6"
            isLoading={mutation.isPending || updatePermissionsMutation.isPending}
          >
            {isEditMode ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
}
