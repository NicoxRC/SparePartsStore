import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCreateLookup, useLookupItem, useUpdateLookup } from '../hooks/useLookups';
import { getApiErrorMessage } from '../lib/errors';
import {
  lookupFormSchema,
  type LookupFormInput,
  type LookupFormValues,
} from '../lib/schemas/lookup';
import type { LookupResource } from '../services/lookups';

interface LookupFormPageProps {
  resource: LookupResource;
  title: string;
  basePath: string;
}

export function LookupFormPage({ resource, title, basePath }: LookupFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const itemQuery = useLookupItem(resource, id);
  const createMutation = useCreateLookup(resource);
  const updateMutation = useUpdateLookup(resource, id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupFormInput, unknown, LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: {
      name: '',
    },
    values: itemQuery.data
      ? {
          name: itemQuery.data.name,
        }
      : undefined,
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const onSubmit = async (values: LookupFormValues) => {
    if (isEditMode) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
    navigate(basePath);
  };

  if (isEditMode && itemQuery.isPending) {
    return <Spinner label="Cargando…" />;
  }

  if (isEditMode && itemQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(itemQuery.error)}</Alert>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        {isEditMode ? `Editar ${title}` : `Nuevo ${title}`}
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
          label="Nombre"
          placeholder="Nombre"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate(basePath)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={mutation.isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear'}
          </Button>
        </div>
      </form>
    </div>
  );
}
