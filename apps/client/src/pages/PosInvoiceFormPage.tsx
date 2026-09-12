import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CustomerPicker } from '../components/CustomerPicker';
import { QuickCreateProductDialog } from '../components/QuickCreateProductDialog';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { useCreatePosInvoice } from '../hooks/usePosInvoices';
import { useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  posInvoiceFormSchema,
  type PosInvoiceFormInput,
  type PosInvoiceFormValues,
} from '../lib/schemas/posInvoice';
import type { CustomerInput, CustomerPartyType, CustomerResponse } from '../services/customers';
import type { ProductResponse } from '../services/products';
import type { ThirdPartyResponse } from '../services/thirdParties';

const DEFAULT_TAX_RATE = 19;

type PosCustomerType = 'NATURAL' | 'JURIDICA';

/**
 * The saved `Customer` record always uses the standard vocabulary
 * (`PERSONA_JURIDICA`/`PERSONA_NATURAL`), while POS's own form uses
 * `NATURAL`/`JURIDICA` — translate at the edges when reading/writing a
 * saved customer from this page.
 */
function posCustomerTypeToPartyType(type: string): CustomerPartyType {
  return type === 'JURIDICA' ? 'PERSONA_JURIDICA' : 'PERSONA_NATURAL';
}

function partyTypeToPosCustomerType(partyType: CustomerPartyType): PosCustomerType {
  return partyType === 'PERSONA_JURIDICA' ? 'JURIDICA' : 'NATURAL';
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CustomerAndPaymentSectionProps {
  register: UseFormRegister<PosInvoiceFormInput>;
  errors: FieldErrors<PosInvoiceFormInput>;
  customerType: string;
  customerSearchQuery: string;
  onCustomerSearchQueryChange: (value: string) => void;
  customerIdentification: string;
  customerIdentificationType: string;
  onSelectCustomer: (customer: CustomerResponse) => void;
  onDianResult: (result: ThirdPartyResponse) => void;
  onSaveCustomer: () => void;
  canSaveCustomer: boolean;
  isSavingCustomer: boolean;
  saveCustomerError: unknown;
}

function CustomerAndPaymentSection({
  register,
  errors,
  customerType,
  customerSearchQuery,
  onCustomerSearchQueryChange,
  customerIdentification,
  customerIdentificationType,
  onSelectCustomer,
  onDianResult,
  onSaveCustomer,
  canSaveCustomer,
  isSavingCustomer,
  saveCustomerError,
}: CustomerAndPaymentSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
          Cliente y pago
        </h2>
        <Button
          type="button"
          variant="secondary"
          className="w-auto px-3 py-2 text-xs sm:min-h-0 sm:px-3 sm:py-1.5"
          disabled={!canSaveCustomer}
          isLoading={isSavingCustomer}
          onClick={onSaveCustomer}
        >
          Guardar cliente
        </Button>
      </div>

      {saveCustomerError !== null && saveCustomerError !== undefined && (
        <Alert variant="error">{getApiErrorMessage(saveCustomerError)}</Alert>
      )}

      <CustomerPicker
        searchQuery={customerSearchQuery}
        onSearchQueryChange={onCustomerSearchQueryChange}
        identification={customerIdentification}
        identificationType={customerIdentificationType}
        onSelectCustomer={onSelectCustomer}
        onDianResult={onDianResult}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Número de venta"
          type="number"
          placeholder="300002"
          error={errors.number?.message}
          {...register('number')}
        />
        <TextField
          label="Fecha"
          type="date"
          error={errors.issueDate?.message}
          {...register('issueDate')}
        />

        <SelectField
          label="Medio de pago"
          error={errors.paymentMeansCode?.message}
          {...register('paymentMeansCode')}
        >
          <option value="CASH">Efectivo</option>
        </SelectField>
        <SelectField
          label="Tipo"
          error={errors.paymentMeansType?.message}
          {...register('paymentMeansType')}
        >
          <option value="DEBITO">Débito</option>
          <option value="CREDITO">Crédito</option>
        </SelectField>

        <SelectField
          label="Tipo de cliente"
          error={errors.customerType?.message}
          {...register('customerType')}
        >
          <option value="NATURAL">Natural</option>
          <option value="JURIDICA">Jurídica</option>
        </SelectField>
        <SelectField
          label="Tipo de identificación"
          error={errors.customerIdentificationType?.message}
          {...register('customerIdentificationType')}
        >
          <option value="CC">Cédula</option>
          <option value="NIT">NIT</option>
        </SelectField>

        <TextField
          label="Identificación"
          error={errors.customerIdentification?.message}
          {...register('customerIdentification')}
        />

        {customerType === 'JURIDICA' ? (
          <TextField
            label="Razón social"
            error={errors.customerCompanyName?.message}
            {...register('customerCompanyName')}
          />
        ) : (
          <>
            <TextField
              label="Nombres"
              error={errors.customerFirstName?.message}
              {...register('customerFirstName')}
            />
            <TextField
              label="Apellidos"
              error={errors.customerFamilyName?.message}
              {...register('customerFamilyName')}
            />
          </>
        )}

        <TextField
          label="Teléfono (opcional)"
          error={errors.customerPhone?.message}
          {...register('customerPhone')}
        />
        <TextField
          label="Correo"
          type="email"
          error={errors.customerEmail?.message}
          {...register('customerEmail')}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-steel">
        <input type="checkbox" {...register('responsableIva')} />
        Cliente responsable de IVA
      </label>
    </section>
  );
}

export function PosInvoiceFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePosInvoice();
  const [productQuery, setProductQuery] = useState('');
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PosInvoiceFormInput, unknown, PosInvoiceFormValues>({
    resolver: zodResolver(posInvoiceFormSchema),
    defaultValues: {
      number: undefined,
      issueDate: todayIsoDate(),
      paymentMeansCode: 'CASH',
      paymentMeansType: 'DEBITO',
      customerType: 'NATURAL',
      customerIdentificationType: 'CC',
      customerIdentification: '',
      customerFirstName: '',
      customerFamilyName: '',
      customerCompanyName: '',
      customerPhone: '',
      customerEmail: '',
      responsableIva: false,
      items: [],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' });

  const customerType = useWatch({ control, name: 'customerType' });
  const customerIdentification = useWatch({ control, name: 'customerIdentification' });
  const customerIdentificationType = useWatch({ control, name: 'customerIdentificationType' });
  const customerEmail = useWatch({ control, name: 'customerEmail' });
  const watchedItems = useWatch({ control, name: 'items' });

  const productsQuery = useProducts({ search: productQuery, limit: 10 });
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer(selectedCustomerId ?? '');
  const saveCustomerMutation = selectedCustomerId ? updateCustomerMutation : createCustomerMutation;

  const handleSelectCustomer = (customer: CustomerResponse) => {
    setSelectedCustomerId(customer.id);
    setValue('customerType', partyTypeToPosCustomerType(customer.partyType));
    setValue('customerIdentificationType', customer.identificationType);
    setValue('customerIdentification', customer.identification);
    setValue('customerCompanyName', customer.companyName ?? '');
    setValue('customerFirstName', customer.firstName ?? '');
    setValue('customerFamilyName', customer.familyName ?? '');
    setValue('customerPhone', customer.phone ?? '');
    setValue('customerEmail', customer.email);
    setValue('responsableIva', customer.responsableIva ?? false);
    setCustomerSearchQuery('');
  };

  const handleDianResult = (result: ThirdPartyResponse) => {
    if (result.companyName) setValue('customerCompanyName', result.companyName);
    if (result.firstName) setValue('customerFirstName', result.firstName);
    if (result.familyName) setValue('customerFamilyName', result.familyName);
    if (result.email) setValue('customerEmail', result.email);
  };

  const handleSaveCustomer = async () => {
    const values = getValues();
    const payload: CustomerInput = {
      identificationType: values.customerIdentificationType,
      identification: values.customerIdentification,
      partyType: posCustomerTypeToPartyType(values.customerType),
      companyName: values.customerCompanyName || undefined,
      firstName: values.customerFirstName || undefined,
      familyName: values.customerFamilyName || undefined,
      phone: values.customerPhone || undefined,
      email: values.customerEmail,
      responsableIva: values.responsableIva,
    };
    try {
      const saved = selectedCustomerId
        ? await updateCustomerMutation.mutateAsync(payload)
        : await createCustomerMutation.mutateAsync(payload);
      setSelectedCustomerId(saved.id);
    } catch {
      // surfaced via saveCustomerMutation.isError / .error below
    }
  };

  const handleAddProduct = (product: ProductResponse, quantity = 1) => {
    appendItem({
      productId: product.id,
      reference: product.reference,
      description: product.description,
      price: product.salePrice,
      stock: product.stock,
      quantity,
      taxRate: DEFAULT_TAX_RATE,
    });
    setProductQuery('');
  };

  const handleProductCreated = (product: ProductResponse, quantity: number) => {
    handleAddProduct(product, quantity);
    setIsCreateProductOpen(false);
  };

  const onSubmit = async (values: PosInvoiceFormValues) => {
    await createMutation.mutateAsync({
      number: values.number,
      issueDate: values.issueDate,
      paymentMeansCode: values.paymentMeansCode,
      paymentMeansType: values.paymentMeansType,
      customerType: values.customerType,
      customerIdentificationType: values.customerIdentificationType,
      customerIdentification: values.customerIdentification,
      customerCompanyName: values.customerCompanyName || undefined,
      customerFirstName: values.customerFirstName || undefined,
      customerFamilyName: values.customerFamilyName || undefined,
      customerPhone: values.customerPhone || undefined,
      customerEmail: values.customerEmail,
      responsableIva: values.responsableIva,
      items: values.items.map(({ productId, quantity, taxRate }) => ({
        productId,
        quantity,
        taxRate,
      })),
    });
    navigate('/invoicing/pos-invoices');
  };

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const base = item.price * quantity;
    return sum + base + Math.round(base * (taxRate / 100));
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Nueva venta POS
      </h1>

      {createMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
          <div className="relative">
            <TextField
              label="Buscar producto por referencia o descripción"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {productQuery.length > 0 && productsQuery.data && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-line bg-white shadow-lg">
                {productsQuery.data.data.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-fog">Sin resultados.</p>
                ) : (
                  productsQuery.data.data.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-mist"
                    >
                      <span className="font-medium text-ink">
                        {product.reference} — {product.description}
                      </span>
                      <span className="text-xs text-fog">
                        ${product.salePrice.toLocaleString('es-CO')} · stock {product.stock}
                      </span>
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setIsCreateProductOpen(true)}
                  className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-mist"
                >
                  + Crear producto nuevo
                </button>
              </div>
            )}
          </div>

          {errors.items?.message && <Alert variant="error">{errors.items.message}</Alert>}

          {itemFields.length > 0 && (
            <div className="overflow-x-auto rounded-sm border border-line">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-canvas text-left text-xs font-medium uppercase tracking-wide text-fog">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Cant.</th>
                    <th className="px-3 py-2">IVA %</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {itemFields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        {field.reference} — {field.description}
                      </td>
                      <td className="px-3 py-2">${field.price.toLocaleString('es-CO')}</td>
                      <td className="w-20 px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={field.stock}
                          className="w-16 rounded-sm border border-line px-2 py-1"
                          {...register(`items.${index}.quantity`)}
                        />
                      </td>
                      <td className="w-20 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          className="w-16 rounded-sm border border-line px-2 py-1"
                          {...register(`items.${index}.taxRate`)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-sm font-medium text-rust hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-right text-lg font-semibold text-ink">
            Total: ${total.toLocaleString('es-CO')}
          </p>
        </section>

        <CustomerAndPaymentSection
          register={register}
          errors={errors}
          customerType={customerType}
          customerSearchQuery={customerSearchQuery}
          onCustomerSearchQueryChange={setCustomerSearchQuery}
          customerIdentification={customerIdentification}
          customerIdentificationType={customerIdentificationType}
          onSelectCustomer={handleSelectCustomer}
          onDianResult={handleDianResult}
          onSaveCustomer={() => void handleSaveCustomer()}
          canSaveCustomer={Boolean(customerIdentification) && Boolean(customerEmail)}
          isSavingCustomer={saveCustomerMutation.isPending}
          saveCustomerError={saveCustomerMutation.isError ? saveCustomerMutation.error : null}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/pos-invoices')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
            Registrar venta
          </Button>
        </div>
      </form>

      {isCreateProductOpen && (
        <QuickCreateProductDialog
          initialReference={productQuery}
          onClose={() => setIsCreateProductOpen(false)}
          onCreated={handleProductCreated}
        />
      )}
    </div>
  );
}
