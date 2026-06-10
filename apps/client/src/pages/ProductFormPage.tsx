import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCreateProduct, useProduct, useUpdateProduct } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormValues,
} from '../lib/schemas/product';

const currencyFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 2,
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
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      reference: '',
      description: '',
      salePrice: 0,
      department: '',
      group: '',
      line: '',
    },
    values: productQuery.data
      ? {
          reference: productQuery.data.reference,
          description: productQuery.data.description,
          salePrice: productQuery.data.salePrice,
          department: productQuery.data.department,
          group: productQuery.data.group,
          line: productQuery.data.line,
        }
      : undefined,
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const onSubmit = async (values: ProductFormValues) => {
    if (isEditMode) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
      reset();
    }
    navigate('/products');
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

      {mutation.isError && (
        <Alert variant="error">{getApiErrorMessage(mutation.error)}</Alert>
      )}

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
          <TextField
            label="Precio de venta"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.salePrice?.message}
            {...register('salePrice')}
          />
        </div>

        <TextField
          label="Descripción"
          placeholder="Descripción del producto"
          error={errors.description?.message}
          {...register('description')}
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
          <TextField
            label="Departamento"
            placeholder="Ej: Frenos"
            error={errors.department?.message}
            {...register('department')}
          />
          <TextField
            label="Grupo"
            placeholder="Ej: Pastillas"
            error={errors.group?.message}
            {...register('group')}
          />
          <TextField
            label="Línea"
            placeholder="Ej: Toyota"
            error={errors.line?.message}
            {...register('line')}
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
    </div>
  );
}
