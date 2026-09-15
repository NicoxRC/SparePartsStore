import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import { SearchableSelect } from '../components/SearchableSelect';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import {
  useOpenCashRegister,
  useTodayCashRegister,
} from '../hooks/useCashRegister';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { useCreateInvoice } from '../hooks/useInvoices';
import { useInvoiceDrafts } from '../hooks/useInvoiceDrafts';
import { useProducts } from '../hooks/useProducts';
import {
  DANE_CITIES,
  DANE_DEPARTMENTS,
} from '../lib/dane';
import { getApiErrorMessage } from '../lib/errors';
import { invoiceDraftLabel, type InvoiceDraft, type InvoiceStep } from '../lib/invoiceDraft';
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type InvoiceFormValues,
} from '../lib/schemas/invoice';
import type { CustomerInput, CustomerPartyType, CustomerResponse } from '../services/customers';
import type { ProductResponse } from '../services/products';
import type { ThirdPartyResponse } from '../services/thirdParties';

const DEFAULT_TAX_RATE = 19;

interface CustomerSectionProps {
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  customerPartyType: string;
  customerSearchQuery: string;
  onCustomerSearchQueryChange: (value: string) => void;
  customerIdentification: string;
  customerIdentificationType: string;
  customerDepartment: string;
  onDepartmentChange: (departmentCode: string) => void;
  onSelectCustomer: (customer: CustomerResponse) => void;
  onDianResult: (result: ThirdPartyResponse) => void;
}

function CustomerSection({
  register,
  errors,
  customerPartyType,
  customerSearchQuery,
  onCustomerSearchQueryChange,
  customerIdentification,
  customerIdentificationType,
  customerDepartment,
  onDepartmentChange,
  onSelectCustomer,
  onDianResult,
}: CustomerSectionProps) {
  const departmentField = register('customerDepartment');
  const citiesForDepartment = DANE_CITIES.filter(
    (city) => city.departmentCode === customerDepartment,
  );
  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Cliente</h2>

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
        {customerIdentificationType === 'NIT' && (
          <TextField
            label="Dígito de verificación"
            placeholder="7"
            error={errors.customerIdentificationDv?.message}
            {...register('customerIdentificationDv')}
          />
        )}
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

        <SelectField
          label="Departamento"
          error={errors.customerDepartment?.message}
          {...departmentField}
          onChange={(e) => {
            void departmentField.onChange(e);
            onDepartmentChange(e.target.value);
          }}
        >
          {DANE_DEPARTMENTS.map((department) => (
            <option key={department.code} value={department.code}>
              {department.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Ciudad"
          error={errors.customerCity?.message}
          disabled={citiesForDepartment.length === 0}
          {...register('customerCity')}
        >
          {citiesForDepartment.length === 0 ? (
            <option value="">Sin ciudades cargadas para este departamento</option>
          ) : (
            citiesForDepartment.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))
          )}
        </SelectField>
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
        <TextField
          label="Celular (opcional)"
          type="tel"
          placeholder="3001234567"
          error={errors.customerPhone?.message}
          {...register('customerPhone')}
        />
      </div>
    </section>
  );
}

interface InvoiceDraftFormProps {
  draft: InvoiceDraft;
}

/**
 * The actual multi-step invoice form for ONE draft. Remounted (via `key`
 * on the caller) whenever the active draft changes, so react-hook-form
 * re-seeds from that draft's own saved values — see InvoiceFormPage below.
 * Every change is synced back into the shared drafts store so switching
 * tabs, or navigating away to Productos/Inventario and back, never loses
 * progress.
 */
function InvoiceDraftForm({ draft }: InvoiceDraftFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateInvoice();
  const { updateDraft, closeDraft } = useInvoiceDrafts();
  const [step, setStepState] = useState<InvoiceStep>(draft.step);
  const [productQuery, setProductQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string | null>(
    draft.selectedCustomerId,
  );

  const setStep = (next: InvoiceStep) => {
    setStepState(next);
    updateDraft(draft.id, { step: next });
  };

  const setSelectedCustomerId = (id: string | null) => {
    setSelectedCustomerIdState(id);
    updateDraft(draft.id, { selectedCustomerId: id });
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: draft.values,
  });

  // Every keystroke updates this draft's saved values — so it survives
  // switching to another tab or navigating away to a different page.
  useEffect(() => {
    const subscription = watch((values) => {
      updateDraft(draft.id, { values: values as InvoiceFormInput });
    });
    return () => subscription.unsubscribe();
  }, [watch, draft.id, updateDraft]);

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' });

  const customerPartyType = useWatch({ control, name: 'customerPartyType' });
  const customerIdentification = useWatch({ control, name: 'customerIdentification' });
  const customerIdentificationType = useWatch({ control, name: 'customerIdentificationType' });
  const customerDepartment = useWatch({ control, name: 'customerDepartment' });
  const paymentMeansType = useWatch({ control, name: 'paymentMeansType' });
  const watchedItems = useWatch({ control, name: 'items' });

  const hasActiveProductSearch =
    productQuery.trim().length > 0 || Boolean(filterDepartmentId) || Boolean(filterGroupId);
  const productsQuery = useProducts({
    search: productQuery || undefined,
    departmentId: filterDepartmentId || undefined,
    groupId: filterGroupId || undefined,
    limit: 10,
  });
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer(selectedCustomerId ?? '');

  const handleSelectCustomer = (customer: CustomerResponse) => {
    setSelectedCustomerId(customer.id);
    setValue('customerIdentificationType', customer.identificationType);
    setValue('customerIdentification', customer.identification);
    setValue('customerIdentificationDv', customer.identificationDv ?? '');
    setValue('customerPhone', customer.phone ?? '');
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

  const handleDepartmentChange = (departmentCode: string) => {
    const cities = DANE_CITIES.filter(
      (city) => city.departmentCode === departmentCode,
    );
    setValue('customerCity', cities[0]?.code ?? '');
  };

  const handleDianResult = (result: ThirdPartyResponse) => {
    if (result.companyName) setValue('customerCompanyName', result.companyName);
    if (result.firstName) setValue('customerFirstName', result.firstName);
    if (result.familyName) setValue('customerFamilyName', result.familyName);
    if (result.email) setValue('customerEmail', result.email);
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
    setFilterDepartmentId('');
    setFilterGroupId('');
  };

  const handleProductCreated = (product: ProductResponse, quantity: number) => {
    handleAddProduct(product, quantity);
    setIsCreateProductOpen(false);
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    // The customer is always saved to the local address book — best
    // effort: a failure here (e.g. a stale conflict) never blocks the
    // actual sale, since the customer record is a convenience, not the
    // point of the transaction.
    try {
      const customerPayload: CustomerInput = {
        identificationType: values.customerIdentificationType,
        identification: values.customerIdentification,
        identificationDv: values.customerIdentificationDv || undefined,
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
        phone: values.customerPhone || undefined,
      };
      const savedCustomer = selectedCustomerId
        ? await updateCustomerMutation.mutateAsync(customerPayload)
        : await createCustomerMutation.mutateAsync(customerPayload);
      setSelectedCustomerId(savedCustomer.id);
    } catch {
      // best-effort, see comment above
    }

    await createMutation.mutateAsync({
      paymentDate: values.paymentMeansType === 'CREDITO' ? values.paymentDate : undefined,
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
    // This draft's sale is done — close it (auto-replaced by a fresh
    // empty one if it was the only draft open) and leave the rest as-is.
    closeDraft(draft.id);
    navigate('/invoicing/invoices');
  };

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const base = item.price * quantity;
    return sum + base + Math.round(base * (taxRate / 100));
  }, 0);

  return (
    <>
      <p className="text-sm text-fog">
        {step === 'products' && 'Paso 1 de 3 · Productos'}
        {step === 'customer' && 'Paso 2 de 3 · Cliente'}
        {step === 'invoice' && 'Paso 3 de 3 · Datos de la factura'}
      </p>

      {createMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-6"
        noValidate
      >
        {step === 'products' ? (
          <>
            <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
                Productos
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    label="Buscar producto por referencia o descripción"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                  />
                </div>
                <SearchableSelect
                  label="Filtrar por departamento"
                  resource="departments"
                  value={filterDepartmentId}
                  onChange={setFilterDepartmentId}
                  clearLabel="Todos"
                />
                <SearchableSelect
                  label="Filtrar por grupo"
                  resource="groups"
                  value={filterGroupId}
                  onChange={setFilterGroupId}
                  clearLabel="Todos"
                />
              </div>

              {hasActiveProductSearch && productsQuery.data && (
                <div className="max-h-64 overflow-y-auto rounded-sm border border-line bg-white">
                  {productsQuery.data.data.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-fog">Sin resultados.</p>
                  ) : (
                    productsQuery.data.data.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-line px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-mist"
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
                            {Number(watchedItems[index]?.taxRate) === 0 && (
                              <span className="mt-1 block text-xs font-medium text-fog">
                                Excluida
                              </span>
                            )}
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

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={() => navigate('/invoicing/invoices')}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="sm:w-auto sm:px-6"
                disabled={itemFields.length === 0}
                onClick={() => setStep('customer')}
              >
                Siguiente
              </Button>
            </div>
          </>
        ) : step === 'customer' ? (
          <>
            <CustomerSection
              register={register}
              errors={errors}
              customerPartyType={customerPartyType}
              customerSearchQuery={customerSearchQuery}
              onCustomerSearchQueryChange={setCustomerSearchQuery}
              customerIdentification={customerIdentification}
              customerIdentificationType={customerIdentificationType}
              customerDepartment={customerDepartment}
              onDepartmentChange={handleDepartmentChange}
              onSelectCustomer={handleSelectCustomer}
              onDianResult={handleDianResult}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={() => navigate('/invoicing/invoices')}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={() => setStep('products')}
              >
                Atrás
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                disabled
                title="Próximamente"
              >
                Cotizar
              </Button>
              <Button
                type="button"
                className="sm:w-auto sm:px-6"
                onClick={() => setStep('invoice')}
              >
                Facturar
              </Button>
            </div>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
                Datos de la factura
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Referencia de orden (opcional)"
                  error={errors.orderReference?.message}
                  {...register('orderReference')}
                />
                <SelectField
                  label="Medio de pago"
                  error={errors.paymentMeans?.message}
                  {...register('paymentMeans')}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="BANK_TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </SelectField>
                <SelectField
                  label="Tipo de pago"
                  error={errors.paymentMeansType?.message}
                  {...register('paymentMeansType')}
                >
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                </SelectField>
                {paymentMeansType === 'CREDITO' && (
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    error={errors.paymentDate?.message}
                    {...register('paymentDate')}
                  />
                )}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded border border-line bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
                  Productos
                </h2>
                <button
                  type="button"
                  onClick={() => setStep('products')}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  Editar productos
                </button>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-steel">
                {watchedItems.map((item, index) => (
                  <li key={itemFields[index]?.id ?? index} className="flex justify-between gap-2">
                    <span>
                      {item.reference} — {item.description} × {item.quantity}
                      {Number(item.taxRate) === 0 && (
                        <span className="ml-2 text-xs font-medium text-fog">
                          (venta excluida sin IVA)
                        </span>
                      )}
                    </span>
                    <span>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                  </li>
                ))}
              </ul>
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
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={() => setStep('customer')}
              >
                Atrás
              </Button>
              <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
                Enviar factura
              </Button>
            </div>
          </>
        )}
      </form>

      {isCreateProductOpen && (
        <QuickCreateProductDialog
          initialReference={productQuery}
          onClose={() => setIsCreateProductOpen(false)}
          onCreated={handleProductCreated}
        />
      )}
    </>
  );
}

export function InvoiceFormPage() {
  const cashRegisterQuery = useTodayCashRegister();
  const openCashRegisterMutation = useOpenCashRegister();
  const { drafts, activeDraftId, setActiveDraftId, addDraft, closeDraft } = useInvoiceDrafts();

  if (cashRegisterQuery.isPending) {
    return <Spinner label="Cargando…" />;
  }

  if (cashRegisterQuery.isError) {
    return (
      <Alert variant="error">
        No se pudo verificar el estado de la caja: {getApiErrorMessage(cashRegisterQuery.error)}
      </Alert>
    );
  }

  if (!cashRegisterQuery.data.isOpen) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-xl font-bold tracking-tight text-ink">Caja cerrada</h1>
        <p className="text-sm text-steel">
          La caja no está abierta hoy. Ábrela para poder facturar.
        </p>
        {openCashRegisterMutation.isError && (
          <Alert variant="error">
            {getApiErrorMessage(openCashRegisterMutation.error)}
          </Alert>
        )}
        <Button
          className="sm:w-auto sm:px-6"
          isLoading={openCashRegisterMutation.isPending}
          onClick={() => void openCashRegisterMutation.mutateAsync()}
        >
          Abrir caja
        </Button>
      </div>
    );
  }

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? drafts[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Nueva factura electrónica
      </h1>

      {/* Several customers can be mid-checkout at once — each tab is an
          independent draft, persisted so switching between them, or
          navigating to Productos/Inventario and back, keeps everything. */}
      <div className="flex flex-wrap items-center gap-2">
        {drafts.map((draft, index) => {
          const isActive = draft.id === activeDraft.id;
          return (
            <span
              key={draft.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                isActive
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white text-steel hover:bg-mist'
              }`}
            >
              <button type="button" onClick={() => setActiveDraftId(draft.id)}>
                {invoiceDraftLabel(draft, index)}
              </button>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => closeDraft(draft.id)}
                  aria-label="Cerrar factura"
                  className={isActive ? 'text-white/70 hover:text-white' : 'text-fog hover:text-ink'}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
        <button
          type="button"
          onClick={addDraft}
          className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-steel hover:bg-mist"
        >
          + Nueva factura
        </button>
      </div>

      <InvoiceDraftForm key={activeDraft.id} draft={activeDraft} />
    </div>
  );
}
