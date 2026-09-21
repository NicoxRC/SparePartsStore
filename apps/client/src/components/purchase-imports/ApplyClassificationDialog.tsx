import { zodResolver } from '@hookform/resolvers/zod';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { SearchableSelect } from '../SearchableSelect';
import { useApplyClassification } from '../../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../../lib/errors';
import {
  applyClassificationSchema,
  type ApplyClassificationValues,
} from '../../lib/schemas/purchaseImport';

interface ApplyClassificationDialogProps {
  importId: string;
  newLineCount: number;
  onClose: () => void;
}

const FIELDS = [
  { name: 'departmentId', label: 'Departamento', resource: 'departments' },
  { name: 'groupId', label: 'Grupo', resource: 'groups' },
  { name: 'brandId', label: 'Marca', resource: 'brands' },
] as const;

export function ApplyClassificationDialog({
  importId,
  newLineCount,
  onClose,
}: ApplyClassificationDialogProps) {
  const applyMutation = useApplyClassification(importId);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyClassificationValues>({
    resolver: zodResolver(applyClassificationSchema),
    defaultValues: { departmentId: '', groupId: '', brandId: '' },
  });

  const onSubmit = async (values: ApplyClassificationValues) => {
    await applyMutation.mutateAsync({
      ...(values.departmentId ? { departmentId: values.departmentId } : {}),
      ...(values.groupId ? { groupId: values.groupId } : {}),
      ...(values.brandId ? { brandId: values.brandId } : {}),
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Aplicar clasificación a las nuevas</h2>
        <p className="mt-2 text-sm text-steel">
          Se aplica a las {newLineCount} líneas nuevas que todavía no tienen ese dato. Lo que ya
          elegiste en una línea no se cambia.
        </p>

        {applyMutation.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(applyMutation.error)}</Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            void handleSubmit(onSubmit)(e);
          }}
          className="mt-4 flex flex-col gap-4"
          noValidate
        >
          {FIELDS.map(({ name, label, resource }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={label}
                  resource={resource}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  placeholder="No cambiar"
                  clearLabel="No cambiar"
                  error={errors[name]?.message}
                  id={`apply-${name}`}
                  name={field.name}
                  allowCreate
                />
              )}
            />
          ))}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={applyMutation.isPending}>
              Aplicar
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
