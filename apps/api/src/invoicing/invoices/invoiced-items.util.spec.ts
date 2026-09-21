import { readInvoicedItems } from './invoiced-items.util';

const payload = (items: unknown) => ({ invoice: { items } });

describe('readInvoicedItems', () => {
  it('reads sku, description, quantity, pre-tax price and IVA rate', () => {
    const result = readInvoicedItems(
      payload([
        {
          sku: 'REP-1',
          description: 'Filtro',
          quantity: 2,
          price: 30000,
          taxes: [{ tax_category: 'IVA', tax_rate: 19, tax_base: 60000 }],
        },
      ]),
    );

    expect(result).toEqual([
      {
        sku: 'REP-1',
        description: 'Filtro',
        quantity: 2,
        unitPrice: 30000,
        taxRate: 19,
      },
    ]);
  });

  it('reports a rate of 0 for a line with no taxes', () => {
    const [item] = readInvoicedItems(
      payload([{ sku: 'A', quantity: 1, price: 100, taxes: [] }]),
    );

    expect(item.taxRate).toBe(0);
    expect(item.description).toBe('');
  });

  it('skips lines that are malformed instead of guessing', () => {
    const result = readInvoicedItems(
      payload([
        { sku: 'OK', quantity: 1, price: 100 },
        { quantity: 1, price: 100 },
        { sku: 'NOPRICE', quantity: 1 },
        { sku: 'NOQTY', price: 100 },
        null,
      ]),
    );

    expect(result.map((item) => item.sku)).toEqual(['OK']);
  });

  it.each([undefined, null, {}, { invoice: {} }, { invoice: { items: 'x' } }])(
    'returns [] for %p',
    (input) => {
      expect(readInvoicedItems(input)).toEqual([]);
    },
  );
});
