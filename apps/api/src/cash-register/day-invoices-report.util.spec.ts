import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { buildDayInvoicesReport } from './day-invoices-report.util';

type Line = { price: number; quantity: number; rate: number };

function invoice(
  overrides: Partial<Invoice> & { means?: string; lines?: Line[] } = {},
): Invoice {
  const {
    means = 'CASH',
    lines = [{ price: 100000, quantity: 1, rate: 19 }],
    ...rest
  } = overrides;
  return {
    number: 1,
    prefix: 'FEE',
    dataicoNumber: 'FEE1',
    totalAmount: 119000,
    requestPayload: {
      invoice: {
        payment_means: means,
        items: lines.map((line, index) => ({
          sku: `S${index}`,
          description: 'x',
          quantity: line.quantity,
          price: line.price,
          taxes:
            line.rate > 0 ? [{ tax_category: 'IVA', tax_rate: line.rate }] : [],
        })),
      },
    },
    ...rest,
  } as Invoice;
}

describe('buildDayInvoicesReport', () => {
  it('is empty for a day without invoices', () => {
    expect(buildDayInvoicesReport('2026-09-21', [])).toEqual({
      registerDate: '2026-09-21',
      invoices: [],
      invoiceCount: 0,
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      taxable: 0,
      tax: 0,
      exempt: 0,
      total: 0,
    });
  });

  it('lists each invoice with its number, total and payment means', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({ dataicoNumber: 'FEE7', totalAmount: 119000 }),
      invoice({
        dataicoNumber: null,
        prefix: 'FVE',
        number: 9,
        means: 'CARD',
        totalAmount: 5000,
      }),
    ]);

    expect(report.invoices).toEqual([
      { number: 'FEE7', total: 119000, paymentMeans: 'CASH' },
      { number: 'FVE9', total: 5000, paymentMeans: 'CARD' },
    ]);
    expect(report.invoiceCount).toBe(2);
  });

  it('splits count and amount by payment means', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({ totalAmount: 100 }),
      invoice({ totalAmount: 200 }),
      invoice({ means: 'CARD', totalAmount: 400 }),
      invoice({ means: 'BANK_TRANSFER', totalAmount: 800 }),
    ]);

    expect(report.cash).toEqual({ count: 2, amount: 300 });
    expect(report.card).toEqual({ count: 1, amount: 400 });
    expect(report.transfer).toEqual({ count: 1, amount: 800 });
  });

  it('lists an invoice paid another way but leaves it out of the split, still in the total', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({ means: 'CHEQUE', totalAmount: 1000 }),
    ]);

    expect(report.invoices[0].paymentMeans).toBeNull();
    expect(
      report.cash.amount + report.card.amount + report.transfer.amount,
    ).toBe(0);
    expect(report.total).toBe(1000);
  });

  it('adds up taxable, IVA and exempt so that they equal the total', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({
        // 100000 + 19000 IVA + 30000 exempt
        totalAmount: 149000,
        lines: [
          { price: 100000, quantity: 1, rate: 19 },
          { price: 30000, quantity: 1, rate: 0 },
        ],
      }),
      invoice({
        totalAmount: 59500,
        lines: [{ price: 25000, quantity: 2, rate: 19 }],
      }),
    ]);

    expect(report.taxable).toBe(150000);
    expect(report.tax).toBe(28500);
    expect(report.exempt).toBe(30000);
    expect(report.taxable + report.tax + report.exempt).toBe(report.total);
  });

  it('works the IVA out of the rate per line when the stored line has none', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({
        totalAmount: 2378,
        lines: [
          { price: 999, quantity: 1, rate: 19 },
          { price: 999, quantity: 1, rate: 19 },
        ],
      }),
    ]);

    // 2 x (999 x 19% = 189.81)
    expect(report.tax).toBe(379.62);
  });

  it('counts an invoice whose stored request has no lines only in the totals', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({ requestPayload: null, totalAmount: 777 }),
    ]);

    expect(report.total).toBe(777);
    expect(report.taxable + report.tax + report.exempt).toBe(0);
    expect(report.invoices[0].paymentMeans).toBeNull();
  });

  it('keeps the order it is given (oldest first)', () => {
    const report = buildDayInvoicesReport('2026-09-21', [
      invoice({ dataicoNumber: 'A' }),
      invoice({ dataicoNumber: 'B' }),
    ]);

    expect(report.invoices.map((row) => row.number)).toEqual(['A', 'B']);
  });
});
