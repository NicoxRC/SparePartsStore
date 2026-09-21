import { BUSINESS_PROFILE } from '../../config/business';
import { amountInWords } from '../../lib/amountInWords';
import { computeLineBreakdown } from '../../lib/invoiceMath';
import { ticketInt, ticketTime } from '../../lib/ticketFormat';
import type { QuotationResponse } from '../../services/quotations';

function customerLabel(quotation: QuotationResponse): string {
  return (
    quotation.customerCompanyName ||
    [quotation.customerFirstName, quotation.customerFamilyName].filter(Boolean).join(' ') ||
    quotation.customerIdentification
  );
}

/** A label on the left and its value in a bordered box on the right (the customer block). */
function BoxedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[38%_1fr] items-center gap-2">
      <span className="text-right text-[11px]">{label}</span>
      <span className="border-2 border-black px-1 py-0.5 text-[12px] font-semibold uppercase">
        {value || '—'}
      </span>
    </div>
  );
}

function TotalRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-[12px] ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Printable cotización, laid out like the store's existing quotation slip:
 * header, customer block, the lines (description and total on one row, and
 * under it the code, quantity × price, IVA and any discount — kept to two
 * short rows per product so it doesn't get crowded on 80 mm), Exentos /
 * Gravados / Subtotal / IVA / Descuento / Valor total, seller and the amount
 * in words. Still a paper guarantee — the
 * customer signs it when merchandise leaves before payment. Every figure is
 * computed from the lines (IVA added on top of each price), never printed
 * from a cached total. See PrintTicket for how this gets shown.
 */
export function QuotationTicket({ quotation }: { quotation: QuotationResponse }) {
  const header = BUSINESS_PROFILE.quotationHeader;
  const lines = (quotation.items ?? []).map((item) => {
    const discount = item.discount ?? 0;
    const breakdown = computeLineBreakdown({
      price: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
      discount,
    });
    const gross = item.unitPrice * item.quantity;
    return {
      item,
      breakdown,
      discount,
      discountPercent: gross > 0 ? Math.round((discount / gross) * 100) : 0,
    };
  });

  const exempt = lines.filter((l) => l.item.taxRate <= 0).reduce((sum, l) => sum + l.breakdown.subtotal, 0);
  const taxable = lines.filter((l) => l.item.taxRate > 0).reduce((sum, l) => sum + l.breakdown.subtotal, 0);
  const tax = lines.reduce((sum, l) => sum + l.breakdown.tax, 0);
  const discount = lines.reduce((sum, l) => sum + l.discount, 0);
  const total = lines.reduce((sum, l) => sum + l.breakdown.total, 0);
  const idNumber = `${quotation.customerIdentification}${
    quotation.customerIdentificationDv ? `-${quotation.customerIdentificationDv}` : ''
  }`;

  return (
    <div className="mx-auto w-[290px] p-2 text-black">
      <p className="text-right text-[11px]">{ticketTime()}</p>

      <p className="border-2 border-black py-1 text-center text-[14px] font-bold">{header.title}</p>
      <div className="mt-1 text-center text-[11px] leading-snug">
        <p>{header.taxId}</p>
        <p>{header.regime}</p>
        <p>{header.address}</p>
      </div>

      <p className="mt-2 border-2 border-black py-1 text-center text-[14px] font-bold">
        COTIZACION No. COT-{String(quotation.number).padStart(4, '0')}
      </p>

      <div className="mt-3 flex flex-col gap-1">
        <BoxedField label="Cliente:" value={customerLabel(quotation)} />
        <BoxedField label="Cédula/Nit:" value={idNumber} />
        <BoxedField label="Teléfono:" value={quotation.customerPhone ?? ''} />
      </div>

      <div className="mt-3 border-2 border-black">
        <div className="flex justify-between border-b-2 border-black px-2 py-1 text-[11px] font-semibold">
          <span>Descripción</span>
          <span>Vr Total</span>
        </div>

        <div className="px-2">
          {lines.map(({ item, breakdown, discountPercent }) => (
            <div key={item.id} className="border-b border-dotted border-black py-2 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <span className="break-words text-[12px] font-semibold uppercase leading-tight">
                  {item.productDescription}
                </span>
                <span className="shrink-0 text-[12px] font-bold">{ticketInt(breakdown.total)}</span>
              </div>
              <p className="mt-1 text-[10px] leading-tight">
                Cód. {item.productReference} · {item.quantity} × {ticketInt(item.unitPrice)}
                {item.taxRate > 0 ? ` · IVA ${item.taxRate}%` : ' · Exento'}
                {discountPercent > 0 ? ` · Dcto ${discountPercent}%` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 border-2 border-black px-1 py-1">
        <TotalRow label="Exentos:" value={ticketInt(exempt)} />
        <TotalRow label="Gravados:" value={ticketInt(taxable)} />
        <TotalRow label="Subtotal:" value={ticketInt(exempt + taxable)} />
        <TotalRow label="IVA:" value={ticketInt(tax)} />
        <TotalRow label="Impoconsumo" value="0" />
        <TotalRow label="Descuento:" value={ticketInt(discount)} />
        <TotalRow label="Valor total:" value={`$${ticketInt(total)}`} bold />
      </div>

      <div className="mt-2 grid grid-cols-[30%_1fr] gap-1 text-[11px] leading-tight">
        <span>Vendedor:</span>
        <span className="font-semibold uppercase">{quotation.createdByName ?? '—'}</span>
        <span>Vr letras:</span>
        <span className="font-semibold">{amountInWords(total)}</span>
      </div>

      <p className="mt-10 border-t border-black pt-1 text-center text-[10px]">
        Firma recibido a satisfacción
      </p>
    </div>
  );
}
