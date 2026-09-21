import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { readInvoicedItems } from '../invoicing/invoices/invoiced-items.util';
import {
  DayInvoiceRowDto,
  DayInvoicesReportDto,
  DayPaymentTotalDto,
} from './dto/day-invoices-report.dto';

const CASH = 'CASH';
const CARD = 'CARD';
const BANK_TRANSFER = 'BANK_TRANSFER';

type InvoiceForReport = Pick<
  Invoice,
  'number' | 'prefix' | 'dataicoNumber' | 'totalAmount' | 'requestPayload'
>;

function paymentMeansOf(invoice: InvoiceForReport): string | null {
  const means = (
    invoice.requestPayload as { invoice?: { payment_means?: unknown } } | null
  )?.invoice?.payment_means;
  return means === CASH || means === CARD || means === BANK_TRANSFER
    ? means
    : null;
}

const empty = (): DayPaymentTotalDto => ({ count: 0, amount: 0 });

/**
 * The day's invoices and how they add up, computed the same way the closing
 * report is: `total` is the sum of the invoices' stored totals, and the
 * payment split reads `payment_means` out of each stored request (anything
 * outside cash/card/transfer is listed but left out of the split). The
 * taxable / IVA / exempt figures come from the lines actually sent, so with
 * IVA added on top they satisfy `taxable + tax + exempt = total`.
 */
export function buildDayInvoicesReport(
  registerDate: string,
  invoices: InvoiceForReport[],
): DayInvoicesReportDto {
  const cash = empty();
  const card = empty();
  const transfer = empty();
  let taxable = 0;
  let tax = 0;
  let exempt = 0;
  let total = 0;

  const rows: DayInvoiceRowDto[] = invoices.map((invoice) => {
    const paymentMeans = paymentMeansOf(invoice);
    const bucket =
      paymentMeans === CASH
        ? cash
        : paymentMeans === CARD
          ? card
          : paymentMeans === BANK_TRANSFER
            ? transfer
            : null;
    if (bucket) {
      bucket.count += 1;
      bucket.amount += invoice.totalAmount;
    }

    for (const line of readInvoicedItems(invoice.requestPayload)) {
      const value = line.unitPrice * line.quantity;
      if (line.taxRate > 0) {
        taxable += value;
        tax += Math.round(value * (line.taxRate / 100));
      } else {
        exempt += value;
      }
    }

    total += invoice.totalAmount;
    return {
      number: invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`,
      total: invoice.totalAmount,
      paymentMeans,
    };
  });

  return {
    registerDate,
    invoices: rows,
    invoiceCount: rows.length,
    cash,
    card,
    transfer,
    taxable,
    tax,
    exempt,
    total,
  };
}
