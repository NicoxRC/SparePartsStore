import {
  computeLineAmounts,
  resolveTaxRate,
  STANDARD_TAX_RATE,
} from './invoice-math.util';

describe('resolveTaxRate', () => {
  it('is the standard 19% unless the product is exempt', () => {
    expect(resolveTaxRate({ taxExempt: false })).toBe(STANDARD_TAX_RATE);
    expect(resolveTaxRate({ taxExempt: true })).toBe(0);
  });
});

describe('computeLineAmounts — IVA is added on top of the price', () => {
  it('adds 19% to the price: 145000 -> 27550 IVA -> 172550', () => {
    expect(computeLineAmounts(145000, 1, 19)).toEqual({
      unitPrice: 145000,
      taxBase: 145000,
      taxAmount: 27550,
      total: 172550,
    });
  });

  it('multiplies by the quantity before taxing', () => {
    const result = computeLineAmounts(50000, 3, 19);

    expect(result.taxBase).toBe(150000);
    expect(result.taxAmount).toBe(28500);
    expect(result.total).toBe(178500);
  });

  it('adds nothing for an exempt line (rate 0): the price is the total', () => {
    expect(computeLineAmounts(145000, 2, 0)).toEqual({
      unitPrice: 145000,
      taxBase: 290000,
      taxAmount: 0,
      total: 290000,
    });
  });

  it('takes a flat discount off the pre-tax subtotal BEFORE computing IVA', () => {
    // 2 x 50000 = 100000, minus 20000 = 80000 -> 19% = 15200
    const result = computeLineAmounts(50000, 2, 19, 20000);

    expect(result.unitPrice).toBe(40000);
    expect(result.taxBase).toBe(80000);
    expect(result.taxAmount).toBe(15200);
    expect(result.total).toBe(95200);
  });

  it('folds the discount into the unit price so unitPrice x quantity is the discounted base', () => {
    const { unitPrice, taxBase } = computeLineAmounts(10000, 3, 19, 5000);

    expect(unitPrice * 3).toBe(taxBase);
    // (30000 - 5000) / 3 = 8333.33 -> 8333 per unit -> 8333 x 3 = 24999
    expect(unitPrice).toBe(8333);
    expect(taxBase).toBe(24999);
  });

  it('never goes below zero when the discount exceeds the subtotal', () => {
    const result = computeLineAmounts(1000, 1, 19, 999999);

    expect(result.unitPrice).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('rounds the IVA to whole pesos', () => {
    // 999 x 19% = 189.81 -> 190
    expect(computeLineAmounts(999, 1, 19).taxAmount).toBe(190);
  });

  it('a zero discount is the same as none', () => {
    expect(computeLineAmounts(50000, 2, 19, 0)).toEqual(
      computeLineAmounts(50000, 2, 19),
    );
  });
});
