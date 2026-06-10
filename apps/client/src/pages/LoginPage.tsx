import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { loginFormSchema, type LoginFormValues } from '../lib/schemas/auth';

export function LoginPage() {
  const { login, isAuthenticated, isLoggingIn, loginError } = useAuth();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/products';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    await login(values).catch(() => {
      // Error message is surfaced via loginError from the auth context.
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-[#1E2A4A]">Iniciar sesión</h2>

      {loginError && <Alert variant="error">{loginError}</Alert>}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="correo@ejemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" isLoading={isLoggingIn}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
