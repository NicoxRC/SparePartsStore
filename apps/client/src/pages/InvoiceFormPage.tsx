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
import { useCreateInvoice } from '../hooks/useInvoices';
import { useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type InvoiceFormValues,
} from '../lib/schemas/invoice';
import type { CustomerInput, CustomerPartyType, CustomerResponse } from '../services/customers';
import type { ProductResponse } from '../services/products';
import type { ThirdPartyResponse } from '../services/thirdParties';

const DEFAULT_TAX_RATE = 19;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CustomerSectionProps {
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  customerPartyType: string;
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

function CustomerSection({
  register,
  errors,
  customerPartyType,
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
}: CustomerSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Cliente</h2>
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
        <SelectField
          label="Tipo de identificación"
          error={errors.customerIdentificationType?.message}
          {...register('customerIdentificationType')}
        >
          <option value="NIT">NIT</option>
          <option value="CC">Cédula de ciudadanía</option>
        </SelectField>
        <TextField
          label="Identificación"
          placeholder="830033494"
          error={errors.customerIdentification?.message}
          {...register('customerIdentification')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo de persona"
          error={errors.customerPartyType?.message}
          {...register('customerPartyType')}
        >
          <option value="PERSONA_JURIDICA">Persona jurídica</option>
          <option value="PERSONA_NATURAL">Persona natural</option>
        </SelectField>
        <SelectField
          label="Responsabilidad tributaria"
          error={errors.customerTaxLevelCode?.message}
          {...register('customerTaxLevelCode')}
        >
          <option value="COMUN">Común</option>
          <option value="SIMPLIFICADO">Simplificado</option>
        </SelectField>

        {customerPartyType === 'PERSONA_JURIDICA' ? (
          <div className="sm:col-span-2">
            <TextField
              label="Razón social"
              error={errors.customerCompanyName?.message}
              {...register('customerCompanyName')}
            />
          </div>
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
          label="Código DANE de departamento"
          placeholder="11"
          error={errors.customerDepartment?.message}
          {...register('customerDepartment')}
        />
        <TextField
          label="Código DANE de ciudad"
          placeholder="001"
          error={errors.customerCity?.message}
          {...register('customerCity')}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Dirección"
            error={errors.customerAddressLine?.message}
            {...register('customerAddressLine')}
          />
        </div>
        <TextField
          label="Correo"
          type="email"
          error={errors.customerEmail?.message}
          {...register('customerEmail')}
        />
      </div>
    </section>
  );
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoice();
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
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: undefined,
      issueDate: todayIsoDate(),
      paymentDate: todayIsoDate(),
      paymentMeans: 'BANK_TRANSFER',
      paymentMeansType: 'DEBITO',
      orderReference: '',
      customerIdentificationType: 'NIT',
      customerIdentification: '',
      customerPartyType: 'PERSONA_JURIDICA',
      customerTaxLevelCode: 'COMUN',
      customerRegimen: '',
      customerCompanyName: '',
      customerFirstName: '',
      customerFamilyName: '',
      customerCountryCode: 'CO',
      customerDepartment: '',
      customerCity: '',
      customerAddressLine: '',
      customerEmail: '',
      items: [],
      notes: '',
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' });

  const customerPartyType = useWatch({ control, name: 'customerPartyType' });
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
    setValue('customerIdentificationType', customer.identificationType);
    setValue('customerIdentification', customer.identification);
    setValue('customerPartyType', customer.partyType);
    setValue('customerTaxLevelCode', customer.taxLevelCode || 'COMUN');
    setValue('customerRegimen', customer.regimen ?? '');
    setValue('customerCompanyName', customer.companyName ?? '');
    setValue('customerFirstName', customer.firstName ?? '');
    setValue('customerFamilyName', customer.familyName ?? '');
    setValue('customerCountryCode', customer.countryCode ?? 'CO');
    setValue('customerDepartment', customer.department ?? '');
    setValue('customerCity', customer.city ?? '');
    setValue('customerAddressLine', customer.addressLine ?? '');
    setValue('customerEmail', customer.email);
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
      partyType: values.customerPartyType as CustomerPartyType,
      companyName: values.customerCompanyName || undefined,
      firstName: values.customerFirstName || undefined,
      familyName: values.customerFamilyName || undefined,
      taxLevelCode: values.customerTaxLevelCode || undefined,
      regimen: values.customerRegimen || undefined,
      countryCode: values.customerCountryCode || undefined,
      department: values.customerDepartment || undefined,
      city: values.customerCity || undefined,
      addressLine: values.customerAddressLine || undefined,
      email: values.customerEmail,
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

  const onSubmit = async (values: InvoiceFormValues) => {
    await createMutation.mutateAsync({
      number: values.number,
      issueDate: values.issueDate,
      paymentDate: values.paymentDate,
      paymentMeans: values.paymentMeans,
      paymentMeansType: values.paymentMeansType,
      orderReference: values.orderReference || undefined,
      customerIdentificationType: values.customerIdentificationType,
      customerIdentification: values.customerIdentification,
      customerPartyType: values.customerPartyType,
      customerTaxLevelCode: values.customerTaxLevelCode,
      customerRegimen: values.customerRegimen || undefined,
      customerCompanyName: values.customerCompanyName || undefined,
      customerFirstName: values.customerFirstName || undefined,
      customerFamilyName: values.customerFamilyName || undefined,
      customerCountryCode: values.customerCountryCode,
      customerDepartment: values.customerDepartment,
      customerCity: values.customerCity,
      customerAddressLine: values.customerAddressLine,
      customerEmail: values.customerEmail,
      items: values.items.map(({ productId, quantity, taxRate }) => ({
        productId,
        quantity,
        taxRate,
      })),
      notes: values.notes ? [values.notes] : undefined,
    });
    navigate('/invoicing/invoices');
  };

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const base = item.price * quantity;
    return sum + base + Math.round(base * (taxRate / 100));
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Nueva factura electrónica
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
            Datos de la factura
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Número"
              type="number"
              placeholder="1225"
              error={errors.number?.message}
              {...register('number')}
            />
            <TextField
              label="Referencia de orden (opcional)"
              error={errors.orderReference?.message}
              {...register('orderReference')}
            />
            <TextField
              label="Fecha de emisión"
              type="date"
              error={errors.issueDate?.message}
              {...register('issueDate')}
            />
            <TextField
              label="Fecha de pago"
              type="date"
              error={errors.paymentDate?.message}
              {...register('paymentDate')}
            />
            <SelectField
              label="Medio de pago"
              error={errors.paymentMeans?.message}
              {...register('paymentMeans')}
            >
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="CREDIT_TRANSFER">Transferencia de crédito</option>
            </SelectField>
            <SelectField
              label="Tipo de pago"
              error={errors.paymentMeansType?.message}
              {...register('paymentMeansType')}
            >
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
            </SelectField>
          </div>
        </section>

        <CustomerSection
          register={register}
          errors={errors}
          customerPartyType={customerPartyType}
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

        <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
            Productos
          </h2>

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
                    <th className="px-3 py-2">Cantidad</th>
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
                      <td className="w-24 px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={field.stock}
                          className="w-20 rounded-sm border border-line px-2 py-1"
                          {...register(`items.${index}.quantity`)}
                        />
                      </td>
                      <td className="w-24 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-sm border border-line px-2 py-1"
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

        <TextField label="Notas (opcional)" {...register('notes')} />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/invoices')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
            Enviar factura
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
