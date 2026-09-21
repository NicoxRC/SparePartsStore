import { BrandTag } from '../components/BrandTag';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CancelQuotationDialog } from '../components/CancelQuotationDialog';
import { PrintTicket } from '../components/print/PrintTicket';
import { QuotationTicket } from '../components/print/QuotationTicket';
import { CustomLineDialog } from '../components/CustomLineDialog';
import { SearchableSelect } from '../components/SearchableSelect';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { usePermissions } from '../hooks/usePermissions';
import { useProducts } from '../hooks/useProducts';
import {
  useInvoiceQuotation,
  useQuotation,
  useUpdateQuotationItems,
} from '../hooks/useQuotations';
import {
  DANE_CITIES,
  DANE_DEPARTMENTS,
  DEFAULT_DANE_CITY_CODE,
  DEFAULT_DANE_DEPARTMENT_CODE,
} from '../lib/dane';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import {
  computeGrossSubtotal,
  computeItemDiscount,
  computeItemTotal,
  summarizeLines,
} from '../lib/invoiceMath';
import { TotalsSummary } from '../components/TotalsSummary';
import { toLowerCase, toUpperCase } from '../lib/textCase';
import type { ProductResponse } from '../services/products';
import type {
  CreateQuotationItemInput,
  InvoiceQuotationCustomerInput,
  QuotationItemResponse,
  QuotationResponse,
} from '../services/quotations';

const DEFAULT_TAX_RATE = 19;

const STATUS_LABEL: Record<QuotationResponse['status'], string> = {
  open: 'Abierta',
  invoiced: 'Facturada',
  cancelled: 'Cancelada',
};

const STATUS_STYLE: Record<QuotationResponse['status'], string> = {
  open: 'bg-amber-tint text-amber',
  invoiced: 'bg-ok-tint text-ok',
  cancelled: 'bg-rust-tint text-rust-2',
};

function quotationNumberLabel(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}

function customerLabelFor(quotation: QuotationResponse): string {
  const personName = [quotation.customerFirstName, quotation.customerFamilyName]
    .filter(Boolean)
    .join(' ');
  return quotation.customerCompanyName || personName || quotation.customerIdentification;
}

interface EditableItem {
  /** '' for a one-off line typed on the quotation (not a catalog product). */
  productId: string;
  reference: string;
  description: string;
  brand: string;
  /** Locked price shown in the editor — re-locked to the live price on save. */
  price: number;
  quantity: number;
  /** Derived from the product's taxExempt flag when added — never a user
   * input (see handleAddProduct). Kept for computeItemTotal()/the "Exenta"
   * badge; never sent to the backend, which derives it itself. */
  taxRate: number;
}

function editableItemsFrom(items: QuotationItemResponse[]): EditableItem[] {
  return items.map((item) => ({
    productId: item.productId ?? '',
    reference: item.productReference ?? '',
    description: item.productDescription,
    brand: item.productBrand ?? '',
    price: item.unitPrice,
    quantity: item.quantity,
    taxRate: item.taxRate,
  }));
}

/**
 * A quotation loaded for editing may already have a discount baked into
 * its items' stored `discount` (flat COP, per item — see
 * QuotationItemResponse) from before this control existed, or from a
 * previous edit. Reconstructs the equivalent global percentage so the
 * "Aplicar descuento" control reflects what's already applied instead of
 * silently resetting to 0 and wiping it out on the next save.
 */
function initialDiscountPercentageFrom(items: QuotationItemResponse[]): number {
  const totalGross = items.reduce(
    (sum, item) =>
      sum + computeGrossSubtotal({ price: item.unitPrice, quantity: item.quantity, taxRate: item.taxRate }),
    0,
  );
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  return totalGross > 0 ? (totalDiscount / totalGross) * 100 : 0;
}

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quotationQuery = useQuotation(id);

  if (quotationQuery.isPending) {
    return <Spinner label="Cargando…" />;
  }

  if (quotationQuery.isError) {
    return (
      <Alert variant="error">{getApiErrorMessage(quotationQuery.error)}</Alert>
    );
  }

  return <QuotationDetailView key={quotationQuery.data.id} quotation={quotationQuery.data} />;
}

function QuotationDetailView({ quotation }: { quotation: QuotationResponse }) {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canUpdate = has('quotations.update');
  const canInvoice = has('quotations.invoice');
  const canCancel = has('quotations.cancel');
  const isOpen = quotation.status === 'open';
  const [isPrinting, setIsPrinting] = useState(false);

  const [items, setItems] = useState<EditableItem[]>(() =>
    editableItemsFrom(quotation.items ?? []),
  );
  const [discountPercentage, setDiscountPercentage] = useState(() =>
    initialDiscountPercentageFrom(quotation.items ?? []),
  );
  const [productQuery, setProductQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [isCustomLineOpen, setIsCustomLineOpen] = useState(false);
  const updateItemsMutation = useUpdateQuotationItems();

  const [isInvoicePanelOpen, setIsInvoicePanelOpen] = useState(false);
  const [paymentMeans, setPaymentMeans] = useState('CASH');
  const [paymentMeansType, setPaymentMeansType] = useState('DEBITO');
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [useSameCustomer, setUseSameCustomer] = useState(true);
  const [overrideCustomer, setOverrideCustomer] = useState<InvoiceQuotationCustomerInput>({
    customerIdentificationType: 'NIT',
    customerIdentification: '',
    customerPartyType: 'PERSONA_JURIDICA',
    customerTaxLevelCode: 'COMUN',
    customerCountryCode: 'CO',
    customerDepartment: DEFAULT_DANE_DEPARTMENT_CODE,
    customerCity: DEFAULT_DANE_CITY_CODE,
    customerAddressLine: '',
    customerEmail: '',
  });
  const invoiceMutation = useInvoiceQuotation();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const hasActiveProductSearch =
    productQuery.trim().length > 0 || Boolean(filterDepartmentId) || Boolean(filterGroupId);
  const productsQuery = useProducts({
    search: productQuery || undefined,
    departmentId: filterDepartmentId || undefined,
    groupId: filterGroupId || undefined,
    limit: 10,
  });

  const handleAddProduct = (product: ProductResponse, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          reference: product.reference,
          description: product.description,
          brand: product.brand?.name ?? '',
          price: product.salePrice,
          quantity,
          taxRate: product.taxExempt ? 0 : DEFAULT_TAX_RATE,
        },
      ];
    });
    setProductQuery('');
    setFilterDepartmentId('');
    setFilterGroupId('');
  };

  // A line for something not in the catalog: it lives only on this quotation.
  const handleAddCustomLine = (line: { description: string; price: number; quantity: number }) => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        reference: '',
        description: line.description,
        brand: '',
        price: line.price,
        quantity: line.quantity,
        taxRate: DEFAULT_TAX_RATE,
      },
    ]);
    setProductQuery('');
    setFilterDepartmentId('');
    setFilterGroupId('');
    setIsCustomLineOpen(false);
  };

  const updateItemField = (index: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + computeItemTotal(item), 0);
  const discountValue = Math.round(total * (discountPercentage / 100));
  const summary = summarizeLines(items, discountPercentage);

  // Both fields drive the same discountPercentage — see the identical
  // pattern on InvoiceFormPage.
  const handleDiscountPercentageChange = (value: string) => {
    setDiscountPercentage(Math.min(100, Math.max(0, Number(value) || 0)));
  };

  const handleDiscountValueChange = (value: string) => {
    const amount = Math.min(total, Math.max(0, Number(value) || 0));
    // Not rounded — see the identical comment on InvoiceFormPage's version:
    // rounding to 2 decimals here crushes small/partial typed amounts down
    // to 0%, silently resetting the field mid-keystroke.
    const pct = total > 0 ? (amount / total) * 100 : 0;
    setDiscountPercentage(pct);
  };

  const handleSaveItems = async () => {
    const input: CreateQuotationItemInput[] = items.map((item) => {
      const discount = computeItemDiscount(item, discountPercentage) || undefined;
      return item.productId
        ? { productId: item.productId, quantity: item.quantity, discount }
        : {
            description: item.description,
            customUnitPrice: item.price,
            quantity: item.quantity,
            discount,
          };
    });
    await updateItemsMutation.mutateAsync({
      id: quotation.id,
      input: { items: input },
    });
    // Back to the list — same pattern as Facturar/Cancelar below.
    navigate('/cotizaciones');
  };

  const handleInvoice = async () => {
    await invoiceMutation.mutateAsync({
      id: quotation.id,
      input: {
        paymentDate: paymentMeansType === 'CREDITO' ? paymentDate : undefined,
        paymentMeans,
        paymentMeansType,
        useSameCustomer,
        customer: useSameCustomer ? undefined : overrideCustomer,
      },
    });
    navigate('/invoicing/invoices');
  };

  const citiesForOverrideDepartment = DANE_CITIES.filter(
    (city) => city.departmentCode === overrideCustomer.customerDepartment,
  );

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
      onKeyDown={handleEnterAsTab}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {quotationNumberLabel(quotation.number)}
          </h1>
          <p className="text-sm text-fog">{customerLabelFor(quotation)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[quotation.status]}`}
          >
            {STATUS_LABEL[quotation.status]}
          </span>
          <button
            type="button"
            onClick={() => setIsPrinting(true)}
            className="text-xs font-medium text-steel hover:text-ink hover:underline"
          >
            Imprimir
          </button>
          {isOpen && canCancel && (
            <button
              type="button"
              onClick={() => setIsCancelDialogOpen(true)}
              className="text-xs font-medium text-rust hover:underline"
            >
              Cancelar cotización
            </button>
          )}
        </div>
      </div>

      {quotation.status === 'invoiced' && (
        <Alert variant="success">
          Facturada — revisa el resultado en Facturas.
        </Alert>
      )}
      {quotation.status === 'cancelled' && (
        <Alert variant="info">Esta cotización fue cancelada; el stock ya fue devuelto.</Alert>
      )}

      <section className="flex flex-col gap-3 rounded border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Cliente</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-fog">Identificación</dt>
            <dd className="text-ink">
              {quotation.customerIdentificationType} {quotation.customerIdentification}
              {quotation.customerIdentificationDv ? `-${quotation.customerIdentificationDv}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-fog">Correo</dt>
            <dd className="text-ink">{quotation.customerEmail}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-fog">Teléfono</dt>
            <dd className="text-ink">{quotation.customerPhone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-fog">Dirección</dt>
            <dd className="text-ink">{quotation.customerAddressLine}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Productos</h2>

        {isOpen && (
          <>
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
          </>
        )}

        {updateItemsMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(updateItemsMutation.error)}</Alert>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-sm border border-line">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-canvas text-left text-xs font-medium uppercase tracking-wide text-fog">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Total</th>
                  {isOpen && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="px-3 py-2">
                      {item.reference ? `${item.reference} — ` : ''}{item.description}
                      {item.taxRate === 0 && (
                        <span className="ml-2 text-xs font-medium text-fog">Exenta</span>
                      )}
                      <BrandTag brand={item.brand} />
                    </td>
                    <td className="px-3 py-2">${item.price.toLocaleString('es-CO')}</td>
                    <td className="w-24 px-3 py-2">
                      {isOpen ? (
                        <input
                          type="number"
                          min={1}
                          className="w-20 border border-line-2 bg-canvas px-2 py-1 font-mono"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(index, { quantity: Number(e.target.value) || 1 })
                          }
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      $
                      {computeItemTotal({
                        ...item,
                        discount: computeItemDiscount(item, discountPercentage),
                      }).toLocaleString('es-CO')}
                    </td>
                    {isOpen && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-sm font-medium text-rust hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          {isOpen && (
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
                onChange={(e) => handleDiscountValueChange(e.target.value)}
              />
            </div>
          )}
          <TotalsSummary {...summary} undiscountedTotal={total} />
        </div>

        {isOpen && canUpdate && (
          <div className="flex justify-end">
            <Button
              type="button"
              className="sm:w-auto sm:px-6"
              disabled={items.length === 0}
              isLoading={updateItemsMutation.isPending}
              onClick={() => void handleSaveItems()}
            >
              Guardar cambios
            </Button>
          </div>
        )}
      </section>

      {isOpen && canInvoice && (
        <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Facturar</h2>
            {!isInvoicePanelOpen && (
              <Button
                type="button"
                className="sm:w-auto sm:px-6"
                onClick={() => setIsInvoicePanelOpen(true)}
              >
                Facturar
              </Button>
            )}
          </div>

          {isInvoicePanelOpen && (
            <>
              {invoiceMutation.isError && (
                <Alert variant="error">{getApiErrorMessage(invoiceMutation.error)}</Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Medio de pago"
                  value={paymentMeans}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentMeans(value);
                    // "Tipo de pago" (contado/crédito) is only a real choice
                    // for tarjeta — outside of that this store always sells
                    // de contado. Dataico still requires the field, so it's
                    // set automatically instead of asking.
                    if (value !== 'CARD') setPaymentMeansType('DEBITO');
                  }}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="BANK_TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </SelectField>
                {paymentMeans === 'CARD' && (
                  <SelectField
                    label="Forma de pago"
                    value={paymentMeansType}
                    onChange={(e) => setPaymentMeansType(e.target.value)}
                  >
                    <option value="DEBITO">Contado</option>
                    <option value="CREDITO">A crédito</option>
                  </SelectField>
                )}
                {paymentMeansType === 'CREDITO' && (
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    checked={useSameCustomer}
                    onChange={() => setUseSameCustomer(true)}
                  />
                  Facturar con los datos de esta cotización
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    checked={!useSameCustomer}
                    onChange={() => setUseSameCustomer(false)}
                  />
                  Facturar a nombre de otro cliente
                </label>
              </div>

              {!useSameCustomer && (
                <div className="grid grid-cols-1 gap-4 rounded-sm border border-line p-4 sm:grid-cols-2">
                  <SelectField
                    label="Tipo de identificación"
                    value={overrideCustomer.customerIdentificationType}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({
                        ...prev,
                        customerIdentificationType: e.target.value,
                      }))
                    }
                  >
                    <option value="NIT">NIT</option>
                    <option value="CC">Cédula de ciudadanía</option>
                  </SelectField>
                  <TextField
                    label="Identificación"
                    value={overrideCustomer.customerIdentification}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({
                        ...prev,
                        customerIdentification: e.target.value,
                      }))
                    }
                  />
                  <SelectField
                    label="Tipo de persona"
                    value={overrideCustomer.customerPartyType}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({
                        ...prev,
                        customerPartyType: e.target.value,
                      }))
                    }
                  >
                    <option value="PERSONA_JURIDICA">Persona jurídica</option>
                    <option value="PERSONA_NATURAL">Persona natural</option>
                  </SelectField>
                  <SelectField
                    label="Responsabilidad tributaria"
                    value={overrideCustomer.customerTaxLevelCode}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({
                        ...prev,
                        customerTaxLevelCode: e.target.value,
                      }))
                    }
                  >
                    <option value="COMUN">Común</option>
                    <option value="SIMPLIFICADO">Simplificado</option>
                  </SelectField>

                  {overrideCustomer.customerPartyType === 'PERSONA_JURIDICA' ? (
                    <div className="sm:col-span-2">
                      <TextField
                        label="Razón social"
                        value={overrideCustomer.customerCompanyName ?? ''}
                        onChange={(e) =>
                          setOverrideCustomer((prev) => ({
                            ...prev,
                            customerCompanyName: toUpperCase(e.target.value),
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <TextField
                        label="Nombres"
                        value={overrideCustomer.customerFirstName ?? ''}
                        onChange={(e) =>
                          setOverrideCustomer((prev) => ({
                            ...prev,
                            customerFirstName: toUpperCase(e.target.value),
                          }))
                        }
                      />
                      <TextField
                        label="Apellidos"
                        value={overrideCustomer.customerFamilyName ?? ''}
                        onChange={(e) =>
                          setOverrideCustomer((prev) => ({
                            ...prev,
                            customerFamilyName: toUpperCase(e.target.value),
                          }))
                        }
                      />
                    </>
                  )}

                  <SelectField
                    label="Departamento"
                    value={overrideCustomer.customerDepartment}
                    onChange={(e) => {
                      const cities = DANE_CITIES.filter(
                        (city) => city.departmentCode === e.target.value,
                      );
                      setOverrideCustomer((prev) => ({
                        ...prev,
                        customerDepartment: e.target.value,
                        customerCity: cities[0]?.code ?? '',
                      }));
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
                    value={overrideCustomer.customerCity}
                    disabled={citiesForOverrideDepartment.length === 0}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({ ...prev, customerCity: e.target.value }))
                    }
                  >
                    {citiesForOverrideDepartment.map((city) => (
                      <option key={city.code} value={city.code}>
                        {city.name}
                      </option>
                    ))}
                  </SelectField>
                  <div className="sm:col-span-2">
                    <TextField
                      label="Dirección"
                      value={overrideCustomer.customerAddressLine}
                      onChange={(e) =>
                        setOverrideCustomer((prev) => ({
                          ...prev,
                          customerAddressLine: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <TextField
                    label="Correo"
                    type="email"
                    value={overrideCustomer.customerEmail}
                    onChange={(e) =>
                      setOverrideCustomer((prev) => ({ ...prev, customerEmail: toLowerCase(e.target.value) }))
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:w-auto sm:px-6"
                  onClick={() => setIsInvoicePanelOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="sm:w-auto sm:px-6"
                  isLoading={invoiceMutation.isPending}
                  onClick={() => void handleInvoice()}
                >
                  Enviar factura
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {isCustomLineOpen && (
        <CustomLineDialog
          initialDescription={productQuery}
          onClose={() => setIsCustomLineOpen(false)}
          onAdd={handleAddCustomLine}
        />
      )}

      {isCancelDialogOpen && (
        <CancelQuotationDialog
          quotationId={quotation.id}
          onClose={() => setIsCancelDialogOpen(false)}
          onCancelled={() => setIsCancelDialogOpen(false)}
        />
      )}

      {isPrinting && (
        <PrintTicket onClose={() => setIsPrinting(false)}>
          <QuotationTicket quotation={quotation} />
        </PrintTicket>
      )}
    </div>
  );
}
