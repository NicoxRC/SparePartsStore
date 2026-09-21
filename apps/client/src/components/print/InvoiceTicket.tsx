import { QRCodeSVG } from 'qrcode.react';
import logo from '../../assets/logo.png';
import { BUSINESS_PROFILE } from '../../config/business';
import {
  TICKET_FONT,
  ticketDate,
  ticketDateTime,
  ticketMoney,
  ticketRangeNumber,
} from '../../lib/ticketFormat';
import type { InvoiceTicket as InvoiceTicketData } from '../../services/invoices';

function Dotted() {
  return <hr className="my-2 border-0 border-t-2 border-dotted border-black" />;
}

/** A label on the left, its value on the right — the receipt's two-column blocks. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[42%_58%] gap-1 py-px text-[10px] leading-tight">
      <span>{label}</span>
      <span className="break-words font-semibold">{value}</span>
    </div>
  );
}

/**
 * The app's logo is white-on-black (made for the dark sidebar). A thermal
 * printer needs black ink on white paper, so everything that isn't the
 * (near-black) background is pushed to full black: grayscale, brighten so the
 * dark red roof counts as ink, a hard contrast so the background's slight
 * noise drops to pure white instead of gray, then invert.
 */
function Logo() {
  return (
    <img
      src={logo}
      alt="La Casa de los Repuestos"
      className="mx-auto max-h-24 w-auto"
      style={{ filter: 'grayscale(1) brightness(3) contrast(5) invert(1)' }}
    />
  );
}

/**
 * The invoice receipt ("tirilla") for the counter printer, laid out like the
 * store's existing Dataico receipt. It is a convenience copy: the certified
 * representation is still Dataico's own PDF. While the DIAN has not accepted
 * the invoice it says so loudly, so an unvalidated document can't be
 * mistaken for a valid one. See PrintTicket for how this gets shown.
 */
export function InvoiceTicket({ ticket }: { ticket: InvoiceTicketData }) {
  const { customer, authorization } = ticket;
  const hasExempt = ticket.items.some((item) => item.taxRate <= 0);
  const generated = ticketDateTime(ticket.issuedAt);
  const isSameDay = ticket.dueDate !== null && ticket.dueDate === ticket.issuedAt.slice(0, 10);

  return (
    <div
      className="mx-auto w-[290px] p-2 text-black"
      style={{ fontFamily: TICKET_FONT }}
    >
      <Logo />

      <div className="mt-3 text-center text-[12px] leading-snug">
        <p className="text-[13px]">{BUSINESS_PROFILE.name}</p>
        <p>{BUSINESS_PROFILE.document}</p>
        <p>{BUSINESS_PROFILE.taxRegime}</p>
        <p>TEL. {BUSINESS_PROFILE.phone}</p>
        <p>{BUSINESS_PROFILE.email}</p>
        <p>{BUSINESS_PROFILE.address}</p>
      </div>

      <Dotted />

      {!ticket.isDianValidated && (
        <p className="mb-2 border-2 border-black p-1 text-center text-[11px] font-bold leading-tight">
          DOCUMENTO SIN VALIDAR ANTE LA DIAN. NO ES UNA FACTURA VÁLIDA.
        </p>
      )}

      <p className="text-center text-[13px]">Factura Electrónica de Venta</p>
      <div className="mt-1">
        <Row label="Número" value={ticket.number} />
        <Row label="Tipo de Operación" value={ticket.operationType} />
        <Row label="Fecha de Generación" value={generated} />
        <Row
          label="Fecha de Vencimiento"
          value={
            ticket.dueDate
              ? isSameDay
                ? generated
                : ticketDate(ticket.dueDate)
              : '—'
          }
        />
        <Row label="Fecha de Validación" value={ticket.validatedAt ?? 'Sin validar'} />
        <Row label="Forma de Pago" value={ticket.paymentForm} />
        <Row label="Medio de Pago" value={ticket.paymentMeans} />
        <Row label="Moneda" value={ticket.currency} />
      </div>

      <Dotted />

      <Row label="CLIENTE" value={customer.name} />
      <Row label="NIT/CC" value={customer.identification} />
      <Row label="EMAIL" value={customer.email} />
      {customer.address && <Row label="DIRECCIÓN" value={customer.address} />}
      {customer.city && <Row label="CIUDAD, DEP." value={`${customer.city} (CO)`} />}

      <Dotted />

      <div className="grid grid-cols-[14%_10%_1fr_28%] gap-1 text-[12px] font-semibold">
        <span>CT</span>
        <span>U/M</span>
        <span>DESCRIPCIÓN</span>
        <span className="text-right">VALOR</span>
      </div>
      {ticket.items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-[14%_10%_1fr_28%] gap-1 py-px text-[10px] uppercase leading-tight"
        >
          <span>{item.quantity}</span>
          <span>{item.unit}</span>
          <span className="break-words">
            {item.description}
            {item.taxRate <= 0 ? ' *' : ''}
          </span>
          <span className="text-right">{ticketMoney(item.value)}</span>
        </div>
      ))}

      <Dotted />

      <div className="flex justify-between text-[12px]">
        <span>Subtotal</span>
        <span>{ticketMoney(ticket.subtotal)}</span>
      </div>
      {ticket.taxes.map((tax) => (
        <div key={tax.rate} className="flex justify-between text-[12px]">
          <span>IVA {tax.rate}%</span>
          <span>{ticketMoney(tax.amount)}</span>
        </div>
      ))}
      <hr className="my-1 border-0 border-t border-black" />
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]">TOTAL a PAGAR</span>
        <span className="text-[20px] font-semibold">{ticketMoney(ticket.total)}</span>
      </div>

      <Dotted />

      <p className="text-[9px]">Unidades de medida: EA = cada{hasExempt ? ' · * Exento de IVA' : ''}</p>

      {authorization && (
        <p className="mt-3 text-center text-[10px] leading-snug">
          Autorización Numeración de Facturación
          <br />
          No. {authorization.resolutionNumber}
          {authorization.startDate && authorization.endDate
            ? ` de ${ticketDate(authorization.startDate)} - ${ticketDate(authorization.endDate)}`
            : ''}
          {authorization.rangeStart !== null && authorization.rangeEnd !== null && (
            <>
              <br />
              autoriza {authorization.prefix} - {ticketRangeNumber(authorization.rangeStart)} a{' '}
              {authorization.prefix} - {ticketRangeNumber(authorization.rangeEnd)}
            </>
          )}
        </p>
      )}

      {ticket.qrCode && (
        <div className="mt-3 flex justify-center">
          <QRCodeSVG value={ticket.qrCode} size={190} level="M" />
        </div>
      )}

      <div className="mt-3 text-center text-[8px] leading-snug">
        {BUSINESS_PROFILE.taxNotices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
        <p>{BUSINESS_PROFILE.softwareProvider}</p>
        <p>{BUSINESS_PROFILE.softwareProviderNit}</p>
      </div>

      {ticket.cufe && (
        <div className="mt-3 text-[8px] leading-tight">
          <p className="font-bold">CUFE:</p>
          <p className="break-all">{ticket.cufe}</p>
        </div>
      )}
    </div>
  );
}
