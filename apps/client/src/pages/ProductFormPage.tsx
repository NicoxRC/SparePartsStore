import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Button } from '../components/Button';
import { CurrencyField } from '../components/CurrencyField';
import { IconCamera } from '../components/icons';
import { SearchableSelect } from '../components/SearchableSelect';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCheckReference, useCreateProduct, useProduct, useUpdateProduct } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormValues,
} from '../lib/schemas/product';

const EMPTY_PRODUCT_FORM: ProductFormInput = {
  reference: '',
  description: '',
  salePrice: 0,
  stock: 0,
  departmentId: '',
  groupId: '',
  brandId: '',
  taxExempt: false,
  supplierId: '',
};

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  // Set by the products list's "+ Nuevo" after a search that found nothing.
  const [searchParams] = useSearchParams();
  const initialReference = isEditMode ? '' : (searchParams.get('reference') ?? '');

  const productQuery = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...EMPTY_PRODUCT_FORM, reference: initialReference },
    values: productQuery.data
      ? {
          reference: productQuery.data.reference,
          description: productQuery.data.description,
          // The form only takes whole pesos; a price stored with cents would
          // otherwise fail validation on an error the rounded field can't show.
          salePrice: Math.round(productQuery.data.salePrice),
          stock: productQuery.data.stock,
          departmentId: productQuery.data.department.id,
          groupId: productQuery.data.group.id,
          brandId: productQuery.data.brand.id,
          taxExempt: productQuery.data.taxExempt,
          supplierId: productQuery.data.supplier?.id ?? '',
        }
      : undefined,
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Reference existence check
  const rawReference = useWatch({ control, name: 'reference' });
  const [debouncedRef, setDebouncedRef] = useState('');

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedRef((rawReference ?? '').toUpperCase()),
      500,
    );
    return () => clearTimeout(id);
  }, [rawReference]);

  const originalRef = isEditMode ? productQuery.data?.reference : undefined;
  const shouldCheckRef =
    debouncedRef.length > 0 &&
    (!isEditMode || debouncedRef !== originalRef);

  const refCheckQuery = useCheckReference(debouncedRef, shouldCheckRef);
  const referenceExists = refCheckQuery.data?.exists === true;

  const onSubmit = async (values: ProductFormValues) => {
    if (referenceExists) return;
    const { supplierId, ...fields } = values;
    try {
      if (isEditMode) {
        // An empty select sends null, which the API turns into INVENTARIO INICIAL.
        await updateMutation.mutateAsync({ ...fields, supplierId: supplierId || null });
        navigate('/products');
      } else {
        await createMutation.mutateAsync({ ...fields, supplierId: supplierId || undefined });
        // The next product is a different one: don't refill the searched reference.
        reset(EMPTY_PRODUCT_FORM);
        setDebouncedRef('');
        setFeedback({ type: 'success', message: 'Producto creado correctamente.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error) });
    }
  };

  // Without this, a validation error on a field scrolled out of view (e.g. the
  // price, at the top on a phone) made "Guardar cambios" look like it did nothing.
  const onInvalid = () => {
    setFeedback({
      type: 'error',
      message: 'Revisa los campos marcados en rojo antes de guardar.',
    });
  };

  if (isEditMode && productQuery.isPending) {
    return <Spinner label="Cargando producto…" />;
  }

  if (isEditMode && productQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(productQuery.error)}</Alert>;
  }

  const referenceInputError = errors.reference?.message ?? (referenceExists ? 'Esta referencia ya existe' : undefined);
  const referenceInputInvalid = Boolean(errors.reference) || referenceExists;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {isEditMode ? 'Editar producto' : 'Nuevo producto'}
      </h1>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit, onInvalid)(e)}
        onKeyDown={handleEnterAsTab}
        className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reference" className="text-sm font-medium text-steel">
              Referencia
            </label>
            <div className="flex gap-2">
              <input
                id="reference"
                type="text"
                placeholder="Ej: ABC-123"
                className={`min-h-12 w-full rounded-sm border px-4 py-3 font-mono uppercase text-base text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink sm:min-h-11 sm:py-2.5 sm:text-sm ${
                  referenceInputInvalid ? 'border-rust' : 'border-line'
                }`}
                aria-invalid={referenceInputInvalid}
                aria-describedby={referenceInputInvalid ? 'reference-error' : undefined}
                {...register('reference')}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-sm border border-line bg-paper text-steel hover:bg-canvas sm:min-h-11 sm:min-w-11"
                aria-label="Escanear código de barras"
              >
                <IconCamera className="h-5 w-5" />
              </button>
            </div>
            {refCheckQuery.isFetching && (
              <p className="text-xs text-fog">Verificando referencia…</p>
            )}
            {referenceInputError && !refCheckQuery.isFetching && (
              <p id="reference-error" className="text-sm text-rust">
                {referenceInputError}
              </p>
            )}
          </div>
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
          label={isEditMode ? 'Stock' : 'Stock inicial'}
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder="0"
          error={errors.stock?.message}
          onFocus={(e) => e.target.select()}
          {...register('stock')}
        />

        <label className="flex items-center gap-2 text-sm text-steel">
          <input type="checkbox" {...register('taxExempt')} />
          Exento de IVA
        </label>

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

        <Controller
          name="supplierId"
          control={control}
          render={({ field }) => (
            // Left empty, the API assigns "INVENTARIO INICIAL".
            <SearchableSelect
              label="Proveedor"
              resource="suppliers"
              value={field.value ?? ''}
              initialLabel={productQuery.data?.supplier?.name}
              onChange={(value) => field.onChange(value)}
              placeholder="INVENTARIO INICIAL"
              name={field.name}
            />
          )}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/products')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="sm:w-auto sm:px-6"
            isLoading={mutation.isPending}
            disabled={referenceExists}
          >
            {isEditMode ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>

      {scannerOpen && (
        <BarcodeScannerModal
          onScanned={(value) => setValue('reference', value, { shouldValidate: true })}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {feedback && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded bg-paper p-6 text-center shadow-lg">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${
                feedback.type === 'success'
                  ? 'bg-ok-tint text-ok'
                  : 'bg-rust-tint text-rust-2'
              }`}
              aria-hidden="true"
            >
              {feedback.type === 'success' ? '✓' : '!'}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-ink">
              {feedback.type === 'success' ? 'Producto creado' : 'Ocurrió un error'}
            </h2>
            <p className="mt-2 text-sm text-steel">{feedback.message}</p>
            <Button type="button" className="mt-5 w-full" onClick={() => setFeedback(null)}>
              Aceptar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
