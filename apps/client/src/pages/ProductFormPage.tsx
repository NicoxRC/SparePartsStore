import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CurrencyField } from '../components/CurrencyField';
import { SearchableSelect } from '../components/SearchableSelect';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCreateProduct, useProduct, useUpdateProduct } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormValues,
} from '../lib/schemas/product';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const productQuery = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      reference: '',
      description: '',
      salePrice: 0,
      stock: 0,
      departmentId: '',
      groupId: '',
      brandId: '',
    },
    values: productQuery.data
      ? {
          reference: productQuery.data.reference,
          description: productQuery.data.description,
          salePrice: productQuery.data.salePrice,
          stock: productQuery.data.stock,
          departmentId: productQuery.data.department.id,
          groupId: productQuery.data.group.id,
          brandId: productQuery.data.brand.id,
        }
      : undefined,
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(values);
        navigate('/products');
      } else {
        await createMutation.mutateAsync(values);
        reset();
        setFeedback({ type: 'success', message: 'Producto creado correctamente.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error) });
    }
  };

  if (isEditMode && productQuery.isPending) {
    return <Spinner label="Cargando producto…" />;
  }

  if (isEditMode && productQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(productQuery.error)}</Alert>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        {isEditMode ? 'Editar producto' : 'Nuevo producto'}
      </h1>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Referencia"
            placeholder="Ej: ABC-123"
            className="font-mono"
            error={errors.reference?.message}
            {...register('reference')}
          />
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
        </div>

        <TextField
          label="Descripción"
          placeholder="Descripción del producto"
          error={errors.description?.message}
          {...register('description')}
        />

        <TextField
          label="Stock"
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder="0"
          error={errors.stock?.message}
          onFocus={(e) => e.target.select()}
          {...register('stock')}
        />

        {isEditMode && productQuery.data && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#3F4654]">Costo (calculado)</span>
            <div className="min-h-12 w-full rounded-lg border border-[#E4E8EF] bg-[#F7F6F4] px-4 py-3 text-base text-[#8B92A3] sm:min-h-11 sm:py-2.5 sm:text-sm">
              {currencyFormatter.format(productQuery.data.cost)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/products')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={mutation.isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>

      {feedback && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${
                feedback.type === 'success'
                  ? 'bg-[#E9F3EC] text-[#2F6B45]'
                  : 'bg-[#FBEAE7] text-[#A93C30]'
              }`}
              aria-hidden="true"
            >
              {feedback.type === 'success' ? '✓' : '!'}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-[#1E2A4A]">
              {feedback.type === 'success' ? 'Producto creado' : 'Ocurrió un error'}
            </h2>
            <p className="mt-2 text-sm text-[#3F4654]">{feedback.message}</p>
            <Button type="button" className="mt-5 w-full" onClick={() => setFeedback(null)}>
              Aceptar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
