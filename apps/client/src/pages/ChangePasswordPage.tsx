import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { handleEnterAsTab } from '../lib/formNavigation';
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-signal">
            Inventario de repuestos
          </p>
          <h1 className="mt-2 text-lg font-semibold text-ink">
            Cambia tu contraseña
          </h1>
          <p className="mt-1 text-sm text-fog">
            Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        <div className="rounded border border-line bg-paper p-6 sm:p-8">
          {changePasswordError && <Alert variant="error">{changePasswordError}</Alert>}

          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            onKeyDown={handleEnterAsTab}
            className="mt-4 flex flex-col gap-4"
            noValidate
          >
            <PasswordField
              label="Contraseña actual"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <PasswordField
              label="Nueva contraseña"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <PasswordField
              label="Confirmar nueva contraseña"
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
