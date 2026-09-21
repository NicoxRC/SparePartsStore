import {
  DraftLine,
  LineIssue,
  validateDraft,
} from './purchase-import-validation';

const newLine = (overrides: Partial<DraftLine> = {}): DraftLine => ({
  id: 'l-1',
  lineNumber: 1,
  quantity: 2,
  reference: 'REF-1',
  description: 'Filtro',
  productId: null,
  linkedProductDeleted: false,
  newDepartmentId: 'd',
  newGroupId: 'g',
  newBrandId: 'b',
  newSalePrice: 1500,
  ...overrides,
});

const linkedLine = (overrides: Partial<DraftLine> = {}): DraftLine => ({
  id: 'l-2',
  lineNumber: 2,
  quantity: 3,
  reference: null,
  description: null,
  productId: 'p-1',
  linkedProductDeleted: false,
  newDepartmentId: null,
  newGroupId: null,
  newBrandId: null,
  newSalePrice: null,
  ...overrides,
});

const issuesOf = (line: DraftLine, others: DraftLine[] = []): LineIssue[] =>
  validateDraft([line, ...others]).issuesByLine.get(line.id)!;

describe('validateDraft', () => {
  it('is ready when every line is complete', () => {
    const result = validateDraft([newLine(), linkedLine()]);

    expect(result.readyToConfirm).toBe(true);
    expect(result.hasNoLines).toBe(false);
  });

  it('flags NO_LINES / not ready for an empty draft', () => {
    const result = validateDraft([]);

    expect(result.hasNoLines).toBe(true);
    expect(result.readyToConfirm).toBe(false);
  });

  describe('quantity (all lines)', () => {
    it.each([null, 0, -1])('flags %s as MISSING_QUANTITY', (quantity) => {
      expect(issuesOf(newLine({ quantity }))).toContain('MISSING_QUANTITY');
      expect(issuesOf(linkedLine({ quantity }))).toContain('MISSING_QUANTITY');
    });

    it('accepts 1', () => {
      expect(issuesOf(newLine({ quantity: 1 }))).toEqual([]);
    });
  });

  describe('new (unlinked) lines', () => {
    it('flags a missing reference', () => {
      expect(issuesOf(newLine({ reference: null }))).toContain(
        'MISSING_REFERENCE',
      );
    });

    it('flags a missing description', () => {
      expect(issuesOf(newLine({ description: null }))).toContain(
        'MISSING_DESCRIPTION',
      );
    });

    it.each(['newDepartmentId', 'newGroupId', 'newBrandId'] as const)(
      'flags a missing %s as MISSING_CLASSIFICATION',
      (field) => {
        expect(issuesOf(newLine({ [field]: null }))).toContain(
          'MISSING_CLASSIFICATION',
        );
      },
    );

    it.each([null, 499, 1500.5, 0])(
      'flags sale price %s as INVALID_SALE_PRICE',
      (newSalePrice) => {
        expect(issuesOf(newLine({ newSalePrice }))).toContain(
          'INVALID_SALE_PRICE',
        );
      },
    );

    it('accepts the minimum sale price of 500', () => {
      expect(issuesOf(newLine({ newSalePrice: 500 }))).toEqual([]);
    });

    it('flags both lines that share a new reference', () => {
      const a = newLine({ id: 'a', reference: 'DUP' });
      const b = newLine({ id: 'b', lineNumber: 2, reference: 'DUP' });
      const result = validateDraft([a, b]);

      expect(result.issuesByLine.get('a')).toContain('DUPLICATE_NEW_REFERENCE');
      expect(result.issuesByLine.get('b')).toContain('DUPLICATE_NEW_REFERENCE');
      expect(result.readyToConfirm).toBe(false);
    });

    it('does not flag a duplicate when one of the lines is linked', () => {
      const a = newLine({ id: 'a', reference: 'DUP' });
      const b = linkedLine({ id: 'b', reference: 'DUP' });

      expect(issuesOf(a, [b])).not.toContain('DUPLICATE_NEW_REFERENCE');
    });
  });

  describe('linked lines', () => {
    it('ignores new-product fields entirely', () => {
      expect(issuesOf(linkedLine())).toEqual([]);
    });

    it.each([null, 500, 12500])(
      'accepts %p as an optional price change',
      (newSalePrice) => {
        expect(issuesOf(linkedLine({ newSalePrice }))).toEqual([]);
      },
    );

    it.each([100, 499, 1500.5, 0])(
      'flags a typed price change of %p as INVALID_SALE_PRICE',
      (newSalePrice) => {
        expect(issuesOf(linkedLine({ newSalePrice }))).toEqual([
          'INVALID_SALE_PRICE',
        ]);
      },
    );

    it('flags a linked product that was soft-deleted', () => {
      expect(issuesOf(linkedLine({ linkedProductDeleted: true }))).toEqual([
        'LINKED_PRODUCT_DELETED',
      ]);
    });
  });

  it('is not ready while any single line has an issue', () => {
    const result = validateDraft([
      newLine(),
      newLine({ id: 'x', quantity: null }),
    ]);

    expect(result.readyToConfirm).toBe(false);
  });
});
