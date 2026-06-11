import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCreateUser, useUpdateUser, useUser } from '../hooks/useUsers';
import { getApiErrorMessage } from '../lib/errors';
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

  const {
    register,
    handleSubmit,
    reset,
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

  const onSubmit = async (values: UserFormValues | UserEditFormValues) => {
    if (isEditMode) {
      const { password, ...rest } = values;
      const payload = password ? { ...rest, password } : rest;
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(values as UserFormValues);
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
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        {isEditMode ? 'Editar usuario' : 'Nuevo usuario'}
      </h1>

      {mutation.isError && (
        <Alert variant="error">{getApiErrorMessage(mutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6"
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

        <p className="text-sm text-[#8B92A3]">
          {isEditMode
            ? 'Si asignas una nueva contraseña, el usuario deberá cambiarla al iniciar sesión.'
            : 'Puedes asignar una contraseña simple. El usuario deberá cambiarla al iniciar sesión por primera vez.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/users')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={mutation.isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
}
