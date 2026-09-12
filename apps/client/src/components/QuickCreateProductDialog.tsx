import { zodResolver } from '@hookform/resolvers/zod';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from './Alert';
import { Button } from './Button';
import { CurrencyField } from './CurrencyField';
import { SearchableSelect } from './SearchableSelect';
import { SelectField } from './SelectField';
import { TextField } from './TextField';
import { useCreateProduct } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  quickCreateProductSchema,
  type QuickCreateProductInput,
  type QuickCreateProductValues,
} from '../lib/schemas/product';
import type { ProductResponse } from '../services/products';

interface QuickCreateProductDialogProps {
  /** Pre-fills the reference field, e.g. with whatever the user already typed into the product search box. */
  initialReference?: string;
  onClose: () => void;
  onCreated: (product: ProductResponse, quantity: number) => void;
}

export function QuickCreateProductDialog({
  initialReference = '',
  onClose,
  onCreated,
}: QuickCreateProductDialogProps) {
  const createMutation = useCreateProduct();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<QuickCreateProductInput, unknown, QuickCreateProductValues>({
    resolver: zodResolver(quickCreateProductSchema),
    defaultValues: {
      reference: initialReference,
      description: '',
      salePrice: 0,
      saleType: 'normal',
      departmentId: '',
      groupId: '',
      brandId: '',
      quantity: 1,
    },
  });

  const onSubmit = async (values: QuickCreateProductValues) => {
    const product = await createMutation.mutateAsync({
      reference: values.reference,
      description: values.description,
      salePrice: values.salePrice,
      saleType: values.saleType,
      stock: values.quantity,
      departmentId: values.departmentId,
      groupId: values.groupId,
      brandId: values.brandId,
    });
    onCreated(product, values.quantity);
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Crear producto nuevo</h2>

        {createMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
        )}

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            void handleSubmit(onSubmit)(e);
          }}
          className="mt-3 flex flex-col gap-4"
          noValidate
        >
          <TextField
            label="Referencia"
            placeholder="Ej: ABC-123"
            className="font-mono uppercase"
            error={errors.reference?.message}
            {...register('reference')}
          />
          <TextField
            label="Descripción"
            placeholder="Descripción del producto"
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="salePrice"
              control={control}
              render={({ field }) => (
                <CurrencyField
                  label="Precio de venta"
                  placeholder="0"
                  error={errors.salePrice?.message}
                  name={field.name}
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <TextField
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              error={errors.quantity?.message}
              onFocus={(e) => e.target.select()}
              {...register('quantity')}
            />
          </div>

          <SelectField
            label="Tipo de venta"
            error={errors.saleType?.message}
            {...register('saleType')}
          >
            <option value="normal">Normal</option>
            <option value="neto">Neto</option>
          </SelectField>

          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Departamento"
                resource="departments"
                value={field.value}
                onChange={field.onChange}
                error={errors.departmentId?.message}
                name={field.name}
                allowCreate
              />
            )}
          />
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Grupo"
                resource="groups"
                value={field.value}
                onChange={field.onChange}
                error={errors.groupId?.message}
                name={field.name}
                allowCreate
              />
            )}
          />
          <Controller
            name="brandId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Marca"
                resource="brands"
                value={field.value}
                onChange={field.onChange}
                error={errors.brandId?.message}
                name={field.name}
                allowCreate
              />
            )}
          />

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Crear y agregar
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
