import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { QuickCreateProductDialog } from '../components/QuickCreateProductDialog';
import { SearchableSelect } from '../components/SearchableSelect';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCreateDebitNote } from '../hooks/useDebitNotes';
import { useInvoice } from '../hooks/useInvoices';
import { useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import { computeItemTotal } from '../lib/invoiceMath';
import type { ProductResponse } from '../services/products';

const DEFAULT_TAX_RATE = 19;

interface EditableItem {
  productId: string;
  reference: string;
  description: string;
  price: number;
  quantity: number;
  taxRate: number;
}

export function DebitNoteFormPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const invoiceQuery = useInvoice(invoiceId);
  const createMutation = useCreateDebitNote();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);

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

  const handleSubmit = async () => {
    if (!invoiceId) return;
    await createMutation.mutateAsync({
      invoiceId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        taxRate: item.taxRate,
      })),
    });
    navigate('/invoicing/invoices');
  };

  if (invoiceQuery.isPending) {
    return <Spinner label="Cargando factura…" />;
  }

  if (invoiceQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(invoiceQuery.error)}</Alert>;
  }

  const invoice = invoiceQuery.data;
  const invoiceLabel = invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" onKeyDown={handleEnterAsTab}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Nota débito
        </h1>
        <p className="text-sm text-fog">
          Contra la factura{' '}
          <span className="font-mono font-medium text-steel">{invoiceLabel}</span>
          {' — '}
          {invoice.customerCompanyName ?? invoice.customerIdentification}
        </p>
      </div>

      {createMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
      )}

      <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
          Productos a agregar
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

        {items.length > 0 && (
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
                {items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="px-3 py-2">
                      {item.reference} — {item.description}
                    </td>
                    <td className="px-3 py-2">${item.price.toLocaleString('es-CO')}</td>
                    <td className="w-24 px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        className="w-20 border border-line-2 bg-canvas px-2 py-1 font-mono"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemField(index, { quantity: Number(e.target.value) || 1 })
                        }
                      />
                    </td>
                    <td className="w-24 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-20 border border-line-2 bg-canvas px-2 py-1 font-mono"
                        value={item.taxRate}
                        onChange={(e) =>
                          updateItemField(index, { taxRate: Number(e.target.value) || 0 })
                        }
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

        <div className="flex justify-end">
          <p className="total-rule px-1 pb-1 font-mono text-lg font-semibold text-ink">
            Total: ${total.toLocaleString('es-CO')}
          </p>
        </div>

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
            disabled={items.length === 0}
            isLoading={createMutation.isPending}
            onClick={() => void handleSubmit()}
          >
            Crear nota débito
          </Button>
        </div>
      </section>

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
