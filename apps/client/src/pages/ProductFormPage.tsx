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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">
        {isEditMode ? 'Editar producto' : 'Nuevo producto'}
      </h1>

      {mutation.isError && (
        <Alert variant="error">{getApiErrorMessage(mutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          label="Referencia"
          placeholder="Ej: ABC-123"
          error={errors.reference?.message}
          {...register('reference')}
        />
        <TextField
          label="Descripción"
          placeholder="Descripción del producto"
          error={errors.description?.message}
          {...register('description')}
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

        {isEditMode && productQuery.data && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Costo (calculado)</span>
            <div className="min-h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-500">
              {currencyFormatter.format(productQuery.data.cost)}
            </div>
          </div>
        )}

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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/products')}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
