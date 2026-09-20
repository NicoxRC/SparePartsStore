import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { TextField } from '../TextField';
import { useRenameSupplier } from '../../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../../lib/errors';
import { supplierRenameSchema, type SupplierRenameValues } from '../../lib/schemas/purchaseImport';
import type { PurchaseImportSupplier } from '../../services/purchaseImports';

interface SupplierHeadingProps {
  supplier: PurchaseImportSupplier;
  /** Only an admin can rename a supplier. */
  canRename: boolean;
}

export function SupplierHeading({ supplier, canRename }: SupplierHeadingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const renameMutation = useRenameSupplier();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierRenameValues>({
    resolver: zodResolver(supplierRenameSchema),
    values: { name: supplier.name },
  });

  const onSubmit = async (values: SupplierRenameValues) => {
    await renameMutation.mutateAsync({ id: supplier.id, input: { name: values.name } });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-2 rounded border border-line bg-paper p-3"
        noValidate
      >
        <TextField
          label="Nombre del proveedor"
          id={`supplier-name-${supplier.id}`}
          error={errors.name?.message}
          {...register('name')}
        />
        {renameMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(renameMutation.error)}</Alert>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={renameMutation.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1">
      <h2 className="min-w-0 truncate text-base font-semibold text-ink">
        {supplier.name}
        <span className="ml-2 font-mono text-xs font-normal text-fog">NIT {supplier.nit}</span>
      </h2>
      {canRename && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="min-h-11 shrink-0 px-2 text-xs font-medium text-steel hover:text-ink hover:underline"
        >
          Renombrar
        </button>
      )}
    </div>
  );
}
