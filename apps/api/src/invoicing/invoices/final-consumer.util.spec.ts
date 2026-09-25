import {
  FINAL_CONSUMER_INVOICE_CAP,
  isFinalConsumer,
  splitFinalConsumerItems,
} from './final-consumer.util';

const groupTotal = (
  group: { quantity: number; productId?: string }[],
  unitValues: Record<string, number>,
) =>
  group.reduce(
    (sum, item) => sum + item.quantity * unitValues[item.productId as string],
    0,
  );

describe('isFinalConsumer', () => {
  it('matches DIAN’s generic identification, ignoring surrounding spaces', () => {
    expect(isFinalConsumer('222222222222')).toBe(true);
    expect(isFinalConsumer(' 222222222222 ')).toBe(true);
    expect(isFinalConsumer('222222222')).toBe(false);
    expect(isFinalConsumer('830033494')).toBe(false);
  });
});

describe('splitFinalConsumerItems', () => {
  it('keeps a sale that fits as a single, untouched group', () => {
    const item = { productId: 'p1', quantity: 2 };
    expect(splitFinalConsumerItems([{ item, total: 200000 }])).toEqual([
      [{ productId: 'p1', quantity: 2, discount: undefined }],
    ]);
  });

  it('splits a 1.000.000 sale into invoices of at most 235.000', () => {
    // 20 units × 50.000 = 1.000.000 → 4 units (200.000) per invoice.
    const groups = splitFinalConsumerItems([
      { item: { productId: 'p1', quantity: 20 }, total: 1000000 },
    ]);

    expect(groups).toHaveLength(5);
    for (const group of groups) {
      expect(groupTotal(group, { p1: 50000 })).toBeLessThanOrEqual(
        FINAL_CONSUMER_INVOICE_CAP,
      );
    }
    expect(groups.flat().reduce((sum, item) => sum + item.quantity, 0)).toBe(
      20,
    );
  });

  it('fills earlier invoices with later lines when they still fit', () => {
    const groups = splitFinalConsumerItems([
      { item: { productId: 'a', quantity: 1 }, total: 200000 },
      { item: { productId: 'b', quantity: 1 }, total: 100000 },
      { item: { productId: 'c', quantity: 1 }, total: 35000 },
    ]);

    expect(groups.map((group) => group.map((item) => item.productId))).toEqual([
      ['a', 'c'],
      ['b'],
    ]);
  });

  it('puts each unit worth more than the cap alone in its own invoice', () => {
    const groups = splitFinalConsumerItems([
      { item: { productId: 'motor', quantity: 2 }, total: 1000000 },
      { item: { productId: 'filtro', quantity: 1 }, total: 30000 },
    ]);

    expect(groups).toEqual([
      [{ productId: 'motor', quantity: 1, discount: undefined }],
      [{ productId: 'motor', quantity: 1, discount: undefined }],
      [{ productId: 'filtro', quantity: 1, discount: undefined }],
    ]);
  });

  it('prorates a line’s discount by units and keeps its exact sum', () => {
    // 3 units × 100.000 − 10.000 = 290.000 → 2 units + 1 unit.
    const groups = splitFinalConsumerItems([
      {
        item: { productId: 'p1', quantity: 3, discount: 10000 },
        total: 290000,
      },
    ]);

    expect(groups).toEqual([
      [{ productId: 'p1', quantity: 2, discount: 6666.67 }],
      [{ productId: 'p1', quantity: 1, discount: 3333.33 }],
    ]);
  });

  it('keeps one-off lines as typed, split by units like any other', () => {
    const custom = { description: 'Mano de obra', customUnitPrice: 150000 };
    const groups = splitFinalConsumerItems([
      { item: { ...custom, quantity: 2 }, total: 300000 },
    ]);

    expect(groups).toEqual([
      [{ ...custom, quantity: 1, discount: undefined }],
      [{ ...custom, quantity: 1, discount: undefined }],
    ]);
  });
});
