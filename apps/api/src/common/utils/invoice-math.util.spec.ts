import {
  computeLineAmounts,
  round,
  resolveTaxRate,
  STANDARD_TAX_RATE,
} from './invoice-math.util';

describe('resolveTaxRate', () => {
  it('is the standard 19% unless the product is exempt', () => {
    expect(resolveTaxRate({ taxExempt: false })).toBe(STANDARD_TAX_RATE);
    expect(resolveTaxRate({ taxExempt: true })).toBe(0);
  });
});

describe('computeLineAmounts — the price already includes IVA', () => {
  it('breaks the IVA out of the price instead of adding it: 145000 -> base 121848.74 + IVA 23151.26', () => {
    expect(computeLineAmounts(145000, 1, 19)).toEqual({
      unitPrice: 121848.7395,
      taxBase: 121848.74,
      taxAmount: 23151.26,
      total: 145000,
    });
  });

  it('a price that unwraps evenly comes back exactly: 1190 -> 1000 + 190', () => {
    expect(computeLineAmounts(1190, 1, 19)).toEqual({
      unitPrice: 1000,
      taxBase: 1000,
      taxAmount: 190,
      total: 1190,
    });
  });

  it('multiplies by the quantity: 3 x 11900 -> 30000 + 5700', () => {
    const result = computeLineAmounts(11900, 3, 19);

    expect(result.unitPrice).toBe(10000);
    expect(result.taxBase).toBe(30000);
    expect(result.taxAmount).toBe(5700);
    expect(result.total).toBe(35700);
  });

  it('leaves an exempt line (rate 0) as it is: the price is the total', () => {
    expect(computeLineAmounts(145000, 2, 0)).toEqual({
      unitPrice: 145000,
      taxBase: 290000,
      taxAmount: 0,
      total: 290000,
    });
  });

  it('takes a flat discount off the final, IVA-included amount', () => {
    // 2 x 11900 = 23800, minus 2380 = 21420 -> 21420 / 1.19 = 18000
    const result = computeLineAmounts(11900, 2, 19, 2380);

    expect(result.unitPrice).toBe(9000);
    expect(result.taxBase).toBe(18000);
    expect(result.taxAmount).toBe(3420);
    expect(result.total).toBe(21420);
  });

  it('folds the discount into the unit price so unitPrice x quantity is the pre-tax base', () => {
    const { unitPrice, taxBase } = computeLineAmounts(10000, 3, 19, 5000);

    expect(round(unitPrice * 3)).toBe(taxBase);
    // (30000 - 5000) = 25000 with IVA -> 21008.40 pre-tax -> 7002.8011 per unit
    expect(unitPrice).toBe(7002.8011);
    expect(taxBase).toBe(21008.4);
  });

  it('never goes below zero when the discount exceeds the amount', () => {
    const result = computeLineAmounts(1000, 1, 19, 999999);

    expect(result.unitPrice).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('a price that does not unwrap evenly still totals exactly what it costs', () => {
    // 85000 / 1.19 = 71428.57; the IVA is what is left: 13571.43
    const result = computeLineAmounts(85000, 1, 19);

    expect(result.taxBase).toBe(71428.57);
    expect(result.taxAmount).toBe(13571.43);
    expect(result.total).toBe(85000);
  });

  it('the total is always exactly price x quantity - discount, for any price and quantity', () => {
    for (const [price, quantity, discount] of [
      [85000, 1, 0],
      [50000, 10, 0],
      [33333, 7, 1234],
      [999, 3, 0],
      [123457, 4, 5000],
    ]) {
      const line = computeLineAmounts(price, quantity, 19, discount);

      expect(line.total).toBe(price * quantity - discount);
      expect(round(line.taxBase + line.taxAmount)).toBe(line.total);
    }
  });

  it('a zero discount is the same as none', () => {
    expect(computeLineAmounts(50000, 2, 19, 0)).toEqual(
      computeLineAmounts(50000, 2, 19),
    );
  });
});
