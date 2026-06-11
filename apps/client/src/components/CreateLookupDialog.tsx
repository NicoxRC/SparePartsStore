import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { TextField } from './TextField';
import { useCreateLookup } from '../hooks/useLookups';
import { getApiErrorMessage } from '../lib/errors';
import {
  lookupFormSchema,
  type LookupFormInput,
  type LookupFormValues,
} from '../lib/schemas/lookup';
import type { LookupResource, LookupResponse } from '../services/lookups';

interface CreateLookupDialogProps {
  resource: LookupResource;
  label: string;
  initialName?: string;
  onClose: () => void;
  onCreated: (item: LookupResponse) => void;
}

export function CreateLookupDialog({
  resource,
  label,
  initialName = '',
  onClose,
  onCreated,
}: CreateLookupDialogProps) {
  const createMutation = useCreateLookup(resource);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupFormInput, unknown, LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: { code: '', name: initialName },
  });

  const onSubmit = async (values: LookupFormValues) => {
    const created = await createMutation.mutateAsync(values);
    onCreated(created);
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-[#1E2A4A]">Nuevo {label}</h2>

        {createMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
        )}

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            void handleSubmit(onSubmit)(e);
          }}
          className="mt-3 flex flex-col gap-3"
          noValidate
        >
          <TextField
            label="Código"
            placeholder="Ej: ABC-123"
            className="font-mono"
            error={errors.code?.message}
            {...register('code')}
          />
          <TextField
            label="Nombre"
            placeholder="Nombre"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
