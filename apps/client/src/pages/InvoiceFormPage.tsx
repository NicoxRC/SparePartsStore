import { BrandTag } from '../components/BrandTag';
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
import { CashMovementDialog } from '../components/CashMovementDialog';
import { CloseCashRegisterDialog } from '../components/CloseCashRegisterDialog';
import { CustomerPicker } from '../components/CustomerPicker';
import { CustomLineDialog } from '../components/CustomLineDialog';
import { SearchableSelect } from '../components/SearchableSelect';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { Toast } from '../components/Toast';
import { PrintInvoiceTicketButton } from '../components/print/PrintInvoiceTicketButton';
import {
  useOpenCashRegister,
  useReopenCashRegister,
  useTodayCashRegister,
} from '../hooks/useCashRegister';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { useCreateInvoice } from '../hooks/useInvoices';
import { useCreateQuotation } from '../hooks/useQuotations';
import { useInvoiceDrafts } from '../hooks/useInvoiceDrafts';
import { usePermissions } from '../hooks/usePermissions';
import { useProducts } from '../hooks/useProducts';
import {
  DANE_CITIES,
  DANE_DEPARTMENTS,
} from '../lib/dane';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import { invoiceDraftLabel, type InvoiceDraft, type InvoiceStep } from '../lib/invoiceDraft';
import { computeItemDiscount, computeItemTotal, summarizeLines } from '../lib/invoiceMath';
import { TotalsSummary } from '../components/TotalsSummary';
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type InvoiceFormValues,
} from '../lib/schemas/invoice';
import { lowerCaseField, toLowerCase, toUpperCase, upperCaseField } from '../lib/textCase';
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
    <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
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
              {...upperCaseField(register('customerCompanyName'))}
            />
          </div>
        ) : (
          <>
            <TextField
              label="Nombres"
              error={errors.customerFirstName?.message}
              {...upperCaseField(register('customerFirstName'))}
            />
            <TextField
              label="Apellidos"
              error={errors.customerFamilyName?.message}
              {...upperCaseField(register('customerFamilyName'))}
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
          {...lowerCaseField(register('customerEmail'))}
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
  onInvoiced: (message: string, pdfUrl: string | null, invoiceId: string) => void;
}

/**
 * The actual multi-step invoice form for ONE draft. Remounted (via `key`
 * on the caller) whenever the active draft changes, so react-hook-form
 * re-seeds from that draft's own saved values — see InvoiceFormPage below.
 * Every change is synced back into the shared drafts store so switching
 * tabs, or navigating away to Productos/Inventario and back, never loses
 * progress.
 */
function InvoiceDraftForm({ draft, onInvoiced }: InvoiceDraftFormProps) {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canInvoice = has('invoices.create');
  const canQuote = has('quotations.create');
  const createMutation = useCreateInvoice();
  const createQuotationMutation = useCreateQuotation();
  const { updateDraft, closeDraft } = useInvoiceDrafts();
  const [step, setStepState] = useState<InvoiceStep>(draft.step);
  const [productQuery, setProductQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [isCustomLineOpen, setIsCustomLineOpen] = useState(false);
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

  // Abandons this draft (auto-replaced by a fresh empty one if it was the
  // only one open) and stays on Venta — this is not "go look at Facturas",
  // it's "never mind this sale".
  const handleCancel = () => {
    closeDraft(draft.id);
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
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
  const paymentMeans = useWatch({ control, name: 'paymentMeans' });
  const paymentMeansType = useWatch({ control, name: 'paymentMeansType' });
  const watchedItems = useWatch({ control, name: 'items' });
  const discountPercentage = Number(useWatch({ control, name: 'discountPercentage' })) || 0;

  // "Tipo de pago" (DEBITO/CREDITO) is DIAN's forma de pago — contado vs.
  // venta a crédito — not a card-network choice, and Dataico requires it on
  // every invoice regardless of payment method. Outside of tarjeta this
  // store always sells de contado, so it's set automatically instead of
  // asking; the selector only shows up for CARD, where it's a real choice.
  useEffect(() => {
    if (paymentMeans !== 'CARD') {
      setValue('paymentMeansType', 'DEBITO');
    }
  }, [paymentMeans, setValue]);

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
    setValue('customerCompanyName', toUpperCase(customer.companyName ?? ''));
    setValue('customerFirstName', toUpperCase(customer.firstName ?? ''));
    setValue('customerFamilyName', toUpperCase(customer.familyName ?? ''));
    setValue('customerCountryCode', customer.countryCode ?? 'CO');
    setValue('customerDepartment', customer.department ?? '');
    setValue('customerCity', customer.city ?? '');
    setValue('customerAddressLine', customer.addressLine ?? '');
    setValue('customerEmail', toLowerCase(customer.email));
    setCustomerSearchQuery('');
  };

  // Mirrors whatever's typed into the "Buscar cliente guardado" box into
  // the actual customerIdentification field, so a document number typed
  // there is immediately usable for "Buscar en DIAN" too — without this,
  // a customer with no local match left that field untouched and the DIAN
  // button stayed disabled/unhelpful even though the user had typed a
  // valid identification.
  const handleCustomerSearchQueryChange = (value: string) => {
    setCustomerSearchQuery(value);
    setValue('customerIdentification', value);
  };

  const handleDepartmentChange = (departmentCode: string) => {
    const cities = DANE_CITIES.filter(
      (city) => city.departmentCode === departmentCode,
    );
    setValue('customerCity', cities[0]?.code ?? '');
  };

  const handleDianResult = (result: ThirdPartyResponse) => {
    if (result.companyName) setValue('customerCompanyName', toUpperCase(result.companyName));
    if (result.firstName) setValue('customerFirstName', toUpperCase(result.firstName));
    if (result.familyName) setValue('customerFamilyName', toUpperCase(result.familyName));
    if (result.email) setValue('customerEmail', toLowerCase(result.email));
  };

  const handleAddProduct = (product: ProductResponse, quantity = 1) => {
    appendItem({
      productId: product.id,
      reference: product.reference,
      description: product.description,
      brand: product.brand?.name ?? '',
      price: product.salePrice,
      stock: product.stock,
      quantity,
      taxRate: product.taxExempt ? 0 : DEFAULT_TAX_RATE,
    });
    setProductQuery('');
    setFilterDepartmentId('');
    setFilterGroupId('');
  };

  // A line for something not in the catalog: it lives only on this sale.
  const handleAddCustomLine = (line: { description: string; price: number; quantity: number }) => {
    appendItem({
      productId: '',
      reference: '',
      description: line.description,
      brand: '',
      price: line.price,
      quantity: line.quantity,
      taxRate: DEFAULT_TAX_RATE,
    });
    setProductQuery('');
    setFilterDepartmentId('');
    setFilterGroupId('');
    setIsCustomLineOpen(false);
  };

  // Catalog product by id, or a one-off line by what was typed.
  const toApiItem = (item: InvoiceFormInput['items'][number], discount: number | undefined) =>
    item.productId
      ? { productId: item.productId, quantity: Number(item.quantity), discount }
      : {
          description: item.description,
          customUnitPrice: item.price,
          quantity: Number(item.quantity),
          discount,
        };

  // Both fields drive the same discountPercentage — whichever one the user
  // edits, the other is derived from it against the current pre-discount
  // total (see computeItemDiscount/`rawTotal` below).
  const handleDiscountPercentageChange = (value: string) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    setValue('discountPercentage', pct);
  };

  const handleDiscountValueChange = (value: string, rawTotal: number) => {
    const amount = Math.min(rawTotal, Math.max(0, Number(value) || 0));
    // Not rounded — rounding to e.g. 2 decimals here crushes small/partial
    // amounts down to 0% while typing (typing "1" of "10000" against a
    // 32000 total is 0.003125%, which rounds to 0.00 and silently resets
    // the field to empty). Keeping full precision lets discountValue's
    // Math.round() below reproduce exactly what was typed.
    const pct = rawTotal > 0 ? (amount / rawTotal) * 100 : 0;
    setValue('discountPercentage', pct);
  };

  // The customer is always saved to the local address book — best effort:
  // a failure here (e.g. a stale conflict) never blocks the actual sale
  // or quotation, since the customer record is a convenience, not the
  // point of the transaction. Shared by both onSubmit (Facturar) and
  // handleCotizar below.
  const saveCustomerBestEffort = async (
    values: Pick<
      InvoiceFormValues,
      | 'customerIdentificationType'
      | 'customerIdentification'
      | 'customerIdentificationDv'
      | 'customerPartyType'
      | 'customerCompanyName'
      | 'customerFirstName'
      | 'customerFamilyName'
      | 'customerTaxLevelCode'
      | 'customerRegimen'
      | 'customerCountryCode'
      | 'customerDepartment'
      | 'customerCity'
      | 'customerAddressLine'
      | 'customerEmail'
      | 'customerPhone'
    >,
  ) => {
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
  };

  const handleCotizar = async () => {
    const valid = await trigger([
      'customerIdentificationType',
      'customerIdentification',
      'customerPartyType',
      'customerTaxLevelCode',
      'customerCompanyName',
      'customerFirstName',
      'customerFamilyName',
      'customerCountryCode',
      'customerDepartment',
      'customerCity',
      'customerAddressLine',
      'customerEmail',
    ]);
    if (!valid) return;

    const values = getValues();
    await saveCustomerBestEffort(values);

    const quotation = await createQuotationMutation.mutateAsync({
      customerIdentificationType: values.customerIdentificationType,
      customerIdentification: values.customerIdentification,
      customerIdentificationDv: values.customerIdentificationDv || undefined,
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
      customerPhone: values.customerPhone || undefined,
      items: values.items.map((item) =>
        toApiItem(
          item,
          computeItemDiscount(item, Number(values.discountPercentage) || 0) || undefined,
        ),
      ),
      notes: values.notes || undefined,
    });
    // This draft's sale became a quotation instead — close it (auto-
    // replaced by a fresh empty one if it was the only draft open) and
    // go straight to the new quotation.
    closeDraft(draft.id);
    navigate(`/cotizaciones/${quotation.id}`);
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    await saveCustomerBestEffort(values);

    const invoice = await createMutation.mutateAsync({
      paymentDate: values.paymentMeansType === 'CREDITO' ? values.paymentDate : undefined,
      paymentMeans: values.paymentMeans,
      paymentMeansType: values.paymentMeansType,
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
      items: values.items.map((item) =>
        toApiItem(
          item,
          computeItemDiscount(item, Number(values.discountPercentage) || 0) || undefined,
        ),
      ),
      notes: values.notes ? [values.notes] : undefined,
    });
    // This draft's sale is done — close it (auto-replaced by a fresh
    // empty one if it was the only draft open, so the tab is ready for
    // the next sale) and stay on Venta, confirming via toast instead of
    // navigating away.
    closeDraft(draft.id);
    const invoiceNumber = invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`;
    onInvoiced(`Factura ${invoiceNumber} creada correctamente.`, invoice.pdfUrl, invoice.id);
  };

  const total = watchedItems.reduce((sum, item) => sum + computeItemTotal(item), 0);
  const discountValue = Math.round(total * (discountPercentage / 100));
  const summary = summarizeLines(watchedItems, discountPercentage);

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
      {createQuotationMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createQuotationMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        onKeyDown={handleEnterAsTab}
        className="flex flex-col gap-6"
        noValidate
      >
        {step === 'products' ? (
          <>
            <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
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
                <div className="max-h-64 overflow-y-auto rounded-sm border border-line bg-paper">
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
                          {product.brand?.name && (
                            <>
                              <span className="font-semibold uppercase text-steel">
                                {product.brand.name}
                              </span>
                              {' · '}
                            </>
                          )}${product.salePrice.toLocaleString('es-CO')} · stock {product.stock}
                        </span>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomLineOpen(true)}
                    className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-mist"
                  >
                    + No existe: agregar con descripción y precio
                  </button>
                </div>
              )}

              {errors.items?.message && <Alert variant="error">{errors.items.message}</Alert>}

              {itemFields.length > 0 && (
                <div className="overflow-x-auto border border-line-2 bg-paper">
                  <table className="min-w-full text-sm">
                    <thead className="border-b-2 border-ink/70 text-left text-xs font-medium uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Precio</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemFields.map((field, index) => {
                        const item = watchedItems[index];
                        return (
                          <tr key={field.id} className="border-b border-dotted border-line-2">
                            <td className="px-3 py-2">
                              {field.reference ? `${field.reference} — ` : ''}{field.description}
                              {Number(item?.taxRate) === 0 && (
                                <span className="ml-2 text-xs font-medium text-fog">
                                  Exenta
                                </span>
                              )}
                              <BrandTag brand={field.brand} />
                            </td>
                            <td className="px-3 py-2 font-mono">
                              ${field.price.toLocaleString('es-CO')}
                            </td>
                            <td className="w-24 px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                max={field.stock}
                                className="w-20 border border-line-2 bg-canvas px-2 py-1 font-mono"
                                {...register(`items.${index}.quantity`)}
                              />
                            </td>
                            <td className="px-3 py-2 font-mono">
                              $
                              {computeItemTotal({
                                ...item,
                                discount: computeItemDiscount(item, discountPercentage),
                              }).toLocaleString('es-CO')}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col items-end gap-2">
                <div className="grid grid-cols-2 gap-3 sm:w-72">
                  <TextField
                    label="Descuento %"
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercentage || ''}
                    onChange={(e) => handleDiscountPercentageChange(e.target.value)}
                  />
                  <TextField
                    label="Valor a descontar"
                    type="number"
                    min={0}
                    max={total}
                    value={discountValue || ''}
                    onChange={(e) => handleDiscountValueChange(e.target.value, total)}
                  />
                </div>
                <TotalsSummary {...summary} undiscountedTotal={total} />
              </div>
            </section>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={handleCancel}
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
              onCustomerSearchQueryChange={handleCustomerSearchQueryChange}
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
                onClick={handleCancel}
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
              {canQuote && (
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:w-auto sm:px-6"
                  isLoading={createQuotationMutation.isPending}
                  onClick={() => void handleCotizar()}
                >
                  Cotizar
                </Button>
              )}
              {canInvoice && (
                <Button
                  type="button"
                  className="sm:w-auto sm:px-6"
                  onClick={() => setStep('invoice')}
                >
                  Facturar
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
                Datos de la factura
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Medio de pago"
                  error={errors.paymentMeans?.message}
                  {...register('paymentMeans')}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="BANK_TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </SelectField>
                {paymentMeans === 'CARD' && (
                  <SelectField
                    label="Forma de pago"
                    error={errors.paymentMeansType?.message}
                    {...register('paymentMeansType')}
                  >
                    <option value="DEBITO">Contado</option>
                    <option value="CREDITO">A crédito</option>
                  </SelectField>
                )}
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

            <section className="flex flex-col gap-3 rounded border border-line bg-paper p-4 sm:p-6">
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
              <ul className="flex flex-col text-sm text-steel">
                {watchedItems.map((item, index) => (
                  <li
                    key={itemFields[index]?.id ?? index}
                    className="flex justify-between gap-2 border-b border-dotted border-line-2 py-1.5"
                  >
                    <span>
                      {item.reference} — {item.description}
                      {item.brand ? ` (${item.brand})` : ''} × {Number(item.quantity)}
                      {Number(item.taxRate) === 0 && (
                        <span className="ml-2 text-xs font-medium text-fog">
                          (venta excluida sin IVA)
                        </span>
                      )}
                    </span>
                    <span className="font-mono">
                      $
                      {computeItemTotal({
                        ...item,
                        discount: computeItemDiscount(item, discountPercentage),
                      }).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>
              <TotalsSummary {...summary} undiscountedTotal={total} />
            </section>

            <TextField label="Notas (opcional)" {...register('notes')} />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-6"
                onClick={handleCancel}
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

      {isCustomLineOpen && (
        <CustomLineDialog
          initialDescription={productQuery}
          onClose={() => setIsCustomLineOpen(false)}
          onAdd={handleAddCustomLine}
        />
      )}
    </>
  );
}

export function InvoiceFormPage() {
  const { has } = usePermissions();
  const cashRegisterQuery = useTodayCashRegister();
  const openCashRegisterMutation = useOpenCashRegister();
  const reopenCashRegisterMutation = useReopenCashRegister();
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    pdfUrl: string | null;
    invoiceId: string;
  } | null>(null);
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
    const parsedOpeningAmount = parseFloat(openingAmount);
    const isValidOpeningAmount = !isNaN(parsedOpeningAmount) && parsedOpeningAmount >= 0;
    const previousClosingCash = cashRegisterQuery.data.previousClosingCash;
    // A register row already exists for today (closedAt set) vs. none was
    // ever opened — two different recoveries: reopen the mistakenly-closed
    // one, or open a fresh one.
    const closedToday = cashRegisterQuery.data.register !== null;

    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-xl font-bold tracking-tight text-ink">Caja cerrada</h1>
        {closedToday ? (
          has('cash_register.reopen') ? (
            <>
              <p className="text-sm text-steel">
                La caja de hoy ya fue cerrada. Si fue un error, puedes reabrirla — se conservan
                todas las ventas y movimientos del día.
              </p>
              {reopenCashRegisterMutation.isError && (
                <Alert variant="error">
                  {getApiErrorMessage(reopenCashRegisterMutation.error)}
                </Alert>
              )}
              <Button
                className="sm:w-auto sm:px-6"
                isLoading={reopenCashRegisterMutation.isPending}
                onClick={() => void reopenCashRegisterMutation.mutateAsync()}
              >
                Reabrir caja
              </Button>
            </>
          ) : (
            <p className="text-sm text-steel">
              La caja de hoy ya fue cerrada. Pide a un administrador o a un compañero que la
              reabra si fue un error.
            </p>
          )
        ) : has('cash_register.open') ? (
          <>
            <p className="text-sm text-steel">
              La caja no está abierta hoy. Cuenta el efectivo en caja y ábrela para poder
              facturar.
            </p>
            <div className="flex w-full flex-col gap-1.5 text-left">
              <label htmlFor="opening-amount" className="text-sm font-medium text-steel">
                Efectivo en caja ahora (base)
              </label>
              <input
                id="opening-amount"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={
                  previousClosingCash !== null
                    ? `Ayer quedaron $${previousClosingCash.toLocaleString('es-CO')}`
                    : 'Ej: 50000'
                }
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="min-h-12 w-full rounded-sm border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-fog focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30 sm:min-h-11 sm:py-2.5 sm:text-sm"
              />
            </div>
            {openCashRegisterMutation.isError && (
              <Alert variant="error">
                {getApiErrorMessage(openCashRegisterMutation.error)}
              </Alert>
            )}
            <Button
              className="sm:w-auto sm:px-6"
              isLoading={openCashRegisterMutation.isPending}
              disabled={!isValidOpeningAmount}
              onClick={() => void openCashRegisterMutation.mutateAsync(parsedOpeningAmount)}
            >
              Abrir caja
            </Button>
          </>
        ) : (
          <p className="text-sm text-steel">
            La caja no está abierta hoy. Pide a un administrador o a un compañero que la abra
            para poder facturar.
          </p>
        )}
      </div>
    );
  }

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? drafts[0];

  // A draft with products added but not yet sent is a sale left mid-way —
  // closing the register would bury it. An untouched empty draft (there's
  // always at least one) doesn't count.
  const pendingDraftLabels = drafts
    .map((draft, index) => (draft.values.items.length > 0 ? invoiceDraftLabel(draft, index) : null))
    .filter((label): label is string => label !== null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Venta
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-tint px-2.5 py-1 text-xs font-medium text-ok">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
            </span>
            Caja abierta desde{' '}
            {new Date(cashRegisterQuery.data.register?.openedAt ?? '').toLocaleTimeString(
              'es-CO',
              { hour: '2-digit', minute: '2-digit' },
            )}
          </span>
          {has('cash_register.movements.create') && (
            <button
              type="button"
              onClick={() => setIsMovementDialogOpen(true)}
              className="text-xs font-medium text-steel hover:text-ink hover:underline"
            >
              Entrada/salida de efectivo
            </button>
          )}
          {has('cash_register.close') && (
            <button
              type="button"
              disabled={pendingDraftLabels.length > 0}
              onClick={() => setIsCloseDialogOpen(true)}
              title={
                pendingDraftLabels.length > 0
                  ? `Termina o cierra esta pestaña primero: ${pendingDraftLabels.join(', ')}`
                  : undefined
              }
              className="text-xs font-medium text-steel hover:text-ink hover:underline disabled:cursor-not-allowed disabled:text-fog disabled:no-underline"
            >
              Cerrar caja
            </button>
          )}
        </div>
        {pendingDraftLabels.length > 0 && (
          <p className="text-xs text-fog">
            {pendingDraftLabels.length === 1
              ? `Tienes una venta sin terminar (${pendingDraftLabels[0]}) — termínala o ciérrala para poder cerrar caja.`
              : `Tienes ${pendingDraftLabels.length} ventas sin terminar (${pendingDraftLabels.join(', ')}) — termínalas o ciérralas para poder cerrar caja.`}
          </p>
        )}
      </div>

      {isCloseDialogOpen && (
        <CloseCashRegisterDialog
          totalSoFar={cashRegisterQuery.data.totalSoFar ?? 0}
          totalOwedSoFar={cashRegisterQuery.data.totalOwedSoFar ?? 0}
          expectedCashSoFar={cashRegisterQuery.data.expectedCashSoFar ?? 0}
          onClose={() => setIsCloseDialogOpen(false)}
          onClosed={() => setIsCloseDialogOpen(false)}
        />
      )}

      {isMovementDialogOpen && (
        <CashMovementDialog
          onClose={() => setIsMovementDialogOpen(false)}
          onCreated={() => setIsMovementDialogOpen(false)}
        />
      )}

      {/* Several customers can be mid-checkout at once — each tab is an
          independent draft, persisted so switching between them, or
          navigating to Productos/Inventario and back, keeps everything.
          The tab strip and the form panel share one border, browser-tab
          style: the active tab overlaps the seam and matches the panel's
          background, so the whole thing reads as a single workspace. */}
      <div className="flex flex-col">
        <div
          role="tablist"
          className="flex items-end gap-1 overflow-x-auto border-b border-line px-1"
        >
          {drafts.map((draft, index) => {
            const isActive = draft.id === activeDraft.id;
            return (
              <div
                key={draft.id}
                role="tab"
                aria-selected={isActive}
                className={`group relative flex shrink-0 items-center gap-2 rounded-t border border-b-0 px-3 py-2 text-sm ${
                  isActive
                    ? 'z-10 -mb-px border-line bg-paper font-medium text-ink'
                    : 'border-transparent bg-transparent text-steel hover:bg-mist'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveDraftId(draft.id)}
                  className="max-w-[9rem] truncate"
                >
                  {invoiceDraftLabel(draft, index)}
                </button>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeDraft(draft.id)}
                    aria-label="Cerrar venta"
                    className={`leading-none ${
                      isActive ? 'text-fog hover:text-ink' : 'text-fog/70 hover:text-ink'
                    }`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addDraft}
            aria-label="Nueva venta"
            className="shrink-0 rounded-t px-3 py-2 text-sm text-steel hover:bg-mist"
          >
            +
          </button>
        </div>

        <div className="rounded-b border border-t-0 border-line bg-paper p-4 sm:p-6">
          <InvoiceDraftForm
            key={activeDraft.id}
            draft={activeDraft}
            onInvoiced={(message, pdfUrl, invoiceId) => setToast({ message, pdfUrl, invoiceId })}
          />
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          onDismiss={() => setToast(null)}
          extra={
            <PrintInvoiceTicketButton
              invoiceId={toast.invoiceId}
              className="font-medium underline hover:opacity-70"
            />
          }
          action={toast.pdfUrl ? { label: 'Ver/imprimir factura', href: toast.pdfUrl } : undefined}
        />
      )}
    </div>
  );
}
