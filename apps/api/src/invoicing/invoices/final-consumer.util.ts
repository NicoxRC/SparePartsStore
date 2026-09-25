import { round } from '../../common/utils/invoice-math.util';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';

/**
 * DIAN's generic identification for a buyer who doesn't give their data
 * ("Consumidor final"). The customer row itself is created by the
 * AddFinalConsumerCustomer migration.
 */
export const FINAL_CONSUMER_IDENTIFICATION = '222222222222';

/**
 * The most a single "Consumidor final" invoice may total (IVA included,
 * after discount) — confirmed directly by the store. A bigger sale is split
 * into several invoices of at most this amount; see splitFinalConsumerItems().
 */
export const FINAL_CONSUMER_INVOICE_CAP = 235000;

export function isFinalConsumer(identification: string): boolean {
  return identification.trim() === FINAL_CONSUMER_IDENTIFICATION;
}

export interface PricedItem {
  item: CreateInvoiceItemDto;
  /** What the customer pays for the whole line (IVA included, after discount). */
  total: number;
}

interface Group {
  items: CreateInvoiceItemDto[];
  total: number;
}

/** Absorbs float noise when checking whether units still fit under the cap. */
const EPSILON = 1e-6;

/**
 * Splits a sale's lines into groups — one invoice each — that total at most
 * `cap`. A line is only ever split by whole units (a part can't be sold in
 * pieces): each group takes as many units as still fit, first-fit, and the
 * line's flat discount is prorated by units (the last piece takes whatever
 * rounding left, so the pieces add up to the original discount exactly).
 *
 * A single unit worth more than the cap can't fit anywhere, so it goes
 * alone in its own invoice, over the cap — confirmed directly by the store.
 * A sale that already fits comes back as one group with the lines untouched.
 */
export function splitFinalConsumerItems(
  lines: PricedItem[],
  cap = FINAL_CONSUMER_INVOICE_CAP,
): CreateInvoiceItemDto[][] {
  const groups: Group[] = [];

  for (const { item, total } of lines) {
    const unitValue = total / item.quantity;
    const discount = item.discount ?? 0;
    let remaining = item.quantity;
    let discountLeft = discount;

    while (remaining > 0) {
      let group: Group | undefined;
      let units: number;
      if (unitValue > cap) {
        group = undefined;
        units = 1;
      } else {
        group = groups.find(
          (candidate) => cap - candidate.total + EPSILON >= unitValue,
        );
        const room = group ? cap - group.total : cap;
        units = Math.min(
          remaining,
          Math.max(1, Math.floor((room + EPSILON) / unitValue)),
        );
      }
      if (!group) {
        group = { items: [], total: 0 };
        groups.push(group);
      }

      const pieceDiscount =
        units === remaining
          ? round(discountLeft)
          : round((discount * units) / item.quantity);
      discountLeft -= pieceDiscount;

      group.items.push({
        ...item,
        quantity: units,
        discount: item.discount === undefined ? undefined : pieceDiscount,
      });
      group.total += unitValue * units;
      remaining -= units;
    }
  }

  return groups.map((group) => group.items);
}
