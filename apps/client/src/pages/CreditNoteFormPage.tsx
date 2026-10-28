import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { TotalsSummary } from '../components/TotalsSummary';
import { useCreateCreditNote, useReturnableLines } from '../hooks/useCreditNotes';
import { useInvoice } from '../hooks/useInvoices';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import { summarizeLines } from '../lib/invoiceMath';
import type { ReturnableLine } from '../services/creditNotes';

/** Quantity to return per sku; a sku missing from it was taken off the note. */
type Quantities = Record<string, number>;

function fullReturn(lines: ReturnableLine[]): Quantities {
  return Object.fromEntries(
    lines
      .filter((line) => line.returnableQuantity > 0)
      .map((line) => [line.sku, line.returnableQuantity]),
  );
}

/** The invoice stores the pre-tax price; prices here include IVA. */
function priceWithTax(line: ReturnableLine): number {
  return Math.round(line.unitPrice * (1 + line.taxRate / 100));
}

/**
 * Mirrors CreditNotesService.resolveReason(): every line at its full
 * invoiced quantity, with nothing returned before, voids the invoice.
 */
function isWholeInvoice(lines: ReturnableLine[], quantities: Quantities): boolean {
  return (
    lines.length > 0 &&
    lines.every(
      (line) =>
        line.returnableQuantity === line.invoicedQuantity &&
        quantities[line.sku] === line.invoicedQuantity,
    )
  );
}

export function CreditNoteFormPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const invoiceQuery = useInvoice(invoiceId);
  const linesQuery = useReturnableLines(invoiceId);
  const createMutation = useCreateCreditNote();

  // null until the cashier changes something: the whole invoice is returned.
  const [editedQuantities, setEditedQuantities] = useState<Quantities | null>(null);

  if (invoiceQuery.isPending || linesQuery.isPending) {
    return <Spinner label="Cargando factura…" />;
  }

  if (invoiceQuery.isError || linesQuery.isError) {
    return (
      <Alert variant="error">
        {getApiErrorMessage(invoiceQuery.error ?? linesQuery.error)}
      </Alert>
    );
  }

  const invoice = invoiceQuery.data;
  const lines = linesQuery.data;
  const invoiceLabel = invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`;
  const quantities = editedQuantities ?? fullReturn(lines);
  const selectedLines = lines.filter((line) => quantities[line.sku] !== undefined);
  const hasAnythingLeft = lines.some((line) => line.returnableQuantity > 0);
  const voidsInvoice = isWholeInvoice(lines, quantities);

  const setQuantity = (sku: string, quantity: number | undefined) => {
    setEditedQuantities((prev) => {
      const next = { ...(prev ?? fullReturn(lines)) };
      if (quantity === undefined) {
        delete next[sku];
      } else {
        next[sku] = quantity;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!invoiceId) return;
    await createMutation.mutateAsync({
      invoiceId,
      items: selectedLines.map((line) => ({
        sku: line.sku,
        quantity: quantities[line.sku],
      })),
    });
    navigate('/invoicing/invoices');
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" onKeyDown={handleEnterAsTab}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Nota crédito
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

      {!hasAnythingLeft ? (
        <Alert variant="info">
          Esta factura ya fue devuelta por completo, no queda nada por acreditar.
        </Alert>
      ) : (
        <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
              Productos a devolver
            </h2>
            {editedQuantities !== null && (
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-4"
                onClick={() => setEditedQuantities(null)}
              >
                Devolver toda la factura
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-sm border border-line">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-canvas text-left text-xs font-medium uppercase tracking-wide text-fog">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line) => {
                  const quantity = quantities[line.sku];
                  const isSelected = quantity !== undefined;
                  const alreadyReturned = line.invoicedQuantity - line.returnableQuantity;
                  return (
                    <tr key={line.sku} className={isSelected ? undefined : 'text-fog'}>
                      <td className="px-3 py-2">
                        {line.sku} — {line.description}
                        {line.taxRate === 0 && (
                          <span className="ml-2 text-xs font-medium text-fog">Exenta</span>
                        )}
                        {alreadyReturned > 0 && (
                          <span className="block text-xs text-fog">
                            Ya devueltas {alreadyReturned} de {line.invoicedQuantity}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        ${priceWithTax(line).toLocaleString('es-CO')}
                      </td>
                      <td className="w-24 px-3 py-2">
                        {isSelected ? (
                          <input
                            type="number"
                            min={1}
                            max={line.returnableQuantity}
                            aria-label={`Cantidad a devolver de ${line.sku}`}
                            className="w-20 border border-line-2 bg-canvas px-2 py-1 font-mono"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                line.sku,
                                Math.min(
                                  Math.max(Number(e.target.value) || 1, 1),
                                  line.returnableQuantity,
                                ),
                              )
                            }
                          />
                        ) : (
                          <span className="font-mono">
                            {line.returnableQuantity === 0 ? '—' : 0}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {line.returnableQuantity === 0 ? (
                          <span className="text-xs font-medium">Devuelto</span>
                        ) : isSelected ? (
                          <button
                            type="button"
                            onClick={() => setQuantity(line.sku, undefined)}
                            className="text-sm font-medium text-rust hover:underline"
                          >
                            Quitar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuantity(line.sku, line.returnableQuantity)}
                            className="text-sm font-medium text-ink hover:underline"
                          >
                            Agregar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TotalsSummary
            {...summarizeLines(
              selectedLines.map((line) => ({
                price: priceWithTax(line),
                quantity: quantities[line.sku],
                taxRate: line.taxRate,
              })),
            )}
          />

          {selectedLines.length > 0 && (
            <p className="text-sm text-steel">
              {voidsInvoice
                ? 'Se anula la factura completa.'
                : 'Devolución parcial de la factura.'}
            </p>
          )}

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
              disabled={selectedLines.length === 0}
              isLoading={createMutation.isPending}
              onClick={() => void handleSubmit()}
            >
              {voidsInvoice ? 'Anular factura' : 'Crear nota crédito'}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
