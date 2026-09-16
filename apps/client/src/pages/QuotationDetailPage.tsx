import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CancelQuotationDialog } from '../components/CancelQuotationDialog';
import { QuickCreateProductDialog } from '../components/QuickCreateProductDialog';
import { SearchableSelect } from '../components/SearchableSelect';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
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
import { computeItemTotal } from '../lib/invoiceMath';
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
  productId: string;
  reference: string;
  description: string;
  /** Locked price shown in the editor — re-locked to the live price on save. */
  price: number;
  quantity: number;
  taxRate: number;
  discount: number;
}

function editableItemsFrom(items: QuotationItemResponse[]): EditableItem[] {
  return items.map((item) => ({
    productId: item.productId,
    reference: item.productReference,
    description: item.productDescription,
    price: item.unitPrice,
    quantity: item.quantity,
    taxRate: item.taxRate,
    discount: item.discount ?? 0,
  }));
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
  const isOpen = quotation.status === 'open';

  const [items, setItems] = useState<EditableItem[]>(() =>
    editableItemsFrom(quotation.items ?? []),
  );
  const [productQuery, setProductQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
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
          price: product.salePrice,
          quantity,
          taxRate: DEFAULT_TAX_RATE,
          discount: 0,
        },
      ];
    });
    setProductQuery('');
    setFilterDepartmentId('');
    setFilterGroupId('');
  };

  const handleProductCreated = (product: ProductResponse, quantity: number) => {
    handleAddProduct(product, quantity);
    setIsCreateProductOpen(false);
  };

  const updateItemField = (index: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + computeItemTotal(item), 0);

  const handleSaveItems = async () => {
    const input: CreateQuotationItemInput[] = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      taxRate: item.taxRate,
      discount: item.discount || undefined,
    }));
    const updated = await updateItemsMutation.mutateAsync({
      id: quotation.id,
      input: { items: input },
    });
    // Re-sync from the server response — prices were just re-locked.
    setItems(editableItemsFrom(updated.items ?? []));
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
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
          {isOpen && (
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

      <section className="flex flex-col gap-3 rounded border border-line bg-white p-4 sm:p-6">
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

      <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
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
                  <th className="px-3 py-2">IVA %</th>
                  <th className="px-3 py-2">Descuento</th>
                  {isOpen && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="px-3 py-2">
                      {item.reference} — {item.description}
                    </td>
                    <td className="px-3 py-2">${item.price.toLocaleString('es-CO')}</td>
                    <td className="w-24 px-3 py-2">
                      {isOpen ? (
                        <input
                          type="number"
                          min={1}
                          className="w-20 rounded-sm border border-line px-2 py-1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(index, { quantity: Number(e.target.value) || 1 })
                          }
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="w-24 px-3 py-2">
                      {isOpen ? (
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-sm border border-line px-2 py-1"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateItemField(index, { taxRate: Number(e.target.value) || 0 })
                          }
                        />
                      ) : (
                        item.taxRate
                      )}
                      {item.taxRate === 0 && (
                        <span className="mt-1 block text-xs font-medium text-fog">Excluida</span>
                      )}
                    </td>
                    <td className="w-28 px-3 py-2">
                      {isOpen ? (
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          className="w-24 rounded-sm border border-line px-2 py-1"
                          value={item.discount || ''}
                          onChange={(e) =>
                            updateItemField(index, { discount: Number(e.target.value) || 0 })
                          }
                        />
                      ) : (
                        item.discount || '—'
                      )}
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

        <p className="text-right text-lg font-semibold text-ink">
          Total: ${total.toLocaleString('es-CO')}
        </p>

        {isOpen && (
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

      {isOpen && (
        <section className="flex flex-col gap-4 rounded border border-line bg-white p-4 sm:p-6">
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
                  onChange={(e) => setPaymentMeans(e.target.value)}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="BANK_TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </SelectField>
                <SelectField
                  label="Tipo de pago"
                  value={paymentMeansType}
                  onChange={(e) => setPaymentMeansType(e.target.value)}
                >
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                </SelectField>
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
                            customerCompanyName: e.target.value,
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
                            customerFirstName: e.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Apellidos"
                        value={overrideCustomer.customerFamilyName ?? ''}
                        onChange={(e) =>
                          setOverrideCustomer((prev) => ({
                            ...prev,
                            customerFamilyName: e.target.value,
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
                      setOverrideCustomer((prev) => ({ ...prev, customerEmail: e.target.value }))
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

      {isCreateProductOpen && (
        <QuickCreateProductDialog
          initialReference={productQuery}
          onClose={() => setIsCreateProductOpen(false)}
          onCreated={handleProductCreated}
        />
      )}

      {isCancelDialogOpen && (
        <CancelQuotationDialog
          quotationId={quotation.id}
          onClose={() => setIsCancelDialogOpen(false)}
          onCancelled={() => setIsCancelDialogOpen(false)}
        />
      )}
    </div>
  );
}
