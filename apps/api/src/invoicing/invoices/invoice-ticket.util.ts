import { DianResolution } from '../resolutions/entities/dian-resolution.entity';
import {
  InvoiceTicketDto,
  InvoiceTicketTaxDto,
} from './dto/invoice-ticket.dto';
import { Invoice } from './entities/invoice.entity';
import { readInvoicedItems } from './invoiced-items.util';

/** What every line prints under U/M — same unit code the invoice was sent with. */
const UNIT_LABEL = 'EA';
const CURRENCY = 'COP';

const PAYMENT_MEANS_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  BANK_TRANSFER: 'Transferencia',
};

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function customerName(invoice: Invoice, sent: Json | null): string {
  const company = text(sent?.company_name) ?? invoice.customerCompanyName;
  if (company) return company;
  const person = [
    text(sent?.first_name) ?? invoice.customerFirstName,
    text(sent?.family_name) ?? invoice.customerFamilyName,
  ]
    .filter(Boolean)
    .join(' ');
  return person || invoice.customerIdentification;
}

/** "CHIA, CUNDINAMARCA" from Dataico's echoed customer (names, not DANE codes). */
function cityLabel(echoed: Json | null): string | null {
  const parts = [text(echoed?.city), text(echoed?.department)].filter(
    (part): part is string => part !== null,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Assembles what the invoice receipt prints, from what is already stored:
 * the exact request that was sent (lines, customer, payment) and Dataico's
 * answer (QR, CUFE, city names, validation date). Pure, so it is easy to
 * test; the endpoint only adds the resolution lookup.
 */
export function buildInvoiceTicket(
  invoice: Invoice,
  resolution: DianResolution | null,
): InvoiceTicketDto {
  const request = asObject(asObject(invoice.requestPayload)?.invoice);
  const response = asObject(invoice.responsePayload);
  const sentCustomer = asObject(request?.customer);
  const echoedCustomer = asObject(response?.customer);

  const items = readInvoicedItems(invoice.requestPayload).map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unit: UNIT_LABEL,
    value: line.unitPrice * line.quantity,
    taxRate: line.taxRate,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.value, 0);

  const taxByRate = new Map<number, number>();
  for (const item of items) {
    if (item.taxRate <= 0) continue;
    taxByRate.set(
      item.taxRate,
      (taxByRate.get(item.taxRate) ?? 0) +
        Math.round(item.value * (item.taxRate / 100)),
    );
  }
  const taxes: InvoiceTicketTaxDto[] = [...taxByRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, amount]) => ({ rate, amount }));

  const paymentMeansCode = text(request?.payment_means) ?? '';
  const dianStatus = invoice.dianStatus;
  const validationDate = response?.validation_date;

  return {
    number: invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`,
    operationType: 'Estándar',
    issuedAt: invoice.createdAt.toISOString(),
    dueDate: invoice.paymentDate,
    validatedAt: typeof validationDate === 'string' ? validationDate : null,
    paymentForm:
      invoice.paymentDate && invoice.paymentDate !== invoice.issueDate
        ? 'Crédito'
        : 'Contado',
    paymentMeans:
      PAYMENT_MEANS_LABEL[paymentMeansCode] ?? (paymentMeansCode || '—'),
    currency: CURRENCY,
    customer: {
      name: customerName(invoice, sentCustomer),
      identificationType: invoice.customerIdentificationType,
      identification: invoice.customerIdentification,
      email: invoice.customerEmail,
      address: text(sentCustomer?.address_line),
      city: cityLabel(echoedCustomer),
    },
    items,
    subtotal,
    taxes,
    total: invoice.totalAmount,
    authorization: {
      resolutionNumber: invoice.resolutionNumber,
      prefix: invoice.prefix,
      startDate: resolution?.startDate ?? null,
      endDate: resolution?.endDate ?? null,
      rangeStart: resolution?.rangeStart ?? null,
      rangeEnd: resolution?.rangeEnd ?? null,
    },
    qrCode: invoice.qrCode,
    cufe: invoice.cufe,
    dianStatus,
    isDianValidated: !!dianStatus && dianStatus.includes('ACEPTADO'),
  };
}
