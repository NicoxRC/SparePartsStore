import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from '../lib/schemas/auth';

export function ChangePasswordPage() {
  const { changePassword, isChangingPassword, changePasswordError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    const { currentPassword, newPassword } = values;
    await changePassword({ currentPassword, newPassword }).catch(() => {
      // Error message is surfaced via changePasswordError from the auth context.
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F4] px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#E8853A]">
            Inventario de repuestos
          </p>
          <h1 className="mt-2 text-lg font-semibold text-[#1E2A4A]">
            Cambia tu contraseña
          </h1>
          <p className="mt-1 text-sm text-[#8B92A3]">
            Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E8EF] bg-white p-6 shadow-sm sm:p-8">
          {changePasswordError && <Alert variant="error">{changePasswordError}</Alert>}

          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="mt-4 flex flex-col gap-4"
            noValidate
          >
            <TextField
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <TextField
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <TextField
              label="Confirmar nueva contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="Repite la nueva contraseña"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" isLoading={isChangingPassword}>
              Cambiar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
