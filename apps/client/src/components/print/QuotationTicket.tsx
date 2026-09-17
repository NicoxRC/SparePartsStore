import { computeItemTotal } from '../../lib/invoiceMath';
import type { QuotationResponse } from '../../services/quotations';

function money(value: number) {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function customerLabel(quotation: QuotationResponse): string {
  return (
    quotation.customerCompanyName ||
    [quotation.customerFirstName, quotation.customerFamilyName].filter(Boolean).join(' ') ||
    quotation.customerIdentification
  );
}

/**
 * Printable cotización ticket — used as a paper guarantee: the customer
 * signs it when merchandise leaves before payment, kept by the store to
 * collect later. See PrintTicket for how this gets shown.
 */
export function QuotationTicket({ quotation }: { quotation: QuotationResponse }) {
  const items = quotation.items ?? [];

  return (
    <div className="mx-auto w-[300px] p-4 text-xs leading-relaxed">
      <p className="text-center text-sm font-bold">LA CASA DE LOS REPUESTOS</p>
      <p className="text-center">Cotización COT-{String(quotation.number).padStart(4, '0')}</p>
      <p className="text-center">{new Date(quotation.createdAt).toLocaleDateString('es-CO')}</p>

      <hr className="my-2 border-dashed border-black" />

      <p>Cliente: {customerLabel(quotation)}</p>
      <p>
        {quotation.customerIdentificationType} {quotation.customerIdentification}
        {quotation.customerIdentificationDv ? `-${quotation.customerIdentificationDv}` : ''}
      </p>
      {quotation.customerPhone && <p>Tel: {quotation.customerPhone}</p>}

      <hr className="my-2 border-dashed border-black" />

      {items.map((item) => (
        <div key={item.id} className="mb-1 flex justify-between gap-2">
          <span className="truncate">
            {item.quantity}x {item.productDescription}
          </span>
          <span className="shrink-0">
            {money(computeItemTotal({ price: item.unitPrice, ...item }))}
          </span>
        </div>
      ))}

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{money(quotation.totalAmount)}</span>
      </div>

      <hr className="my-2 border-dashed border-black" />

      <p className="mt-3">
        Recibí conforme los productos descritos arriba, por los cuales me comprometo a pagar el
        valor total indicado.
      </p>

      <p className="mt-6 border-t border-black pt-1 text-center">Firma</p>
      <p className="mt-4">
        CC/NIT: _____________________ Fecha: _____________
      </p>
    </div>
  );
}
