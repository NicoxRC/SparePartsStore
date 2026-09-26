import {
  expandPermissions,
  isPermission,
  PERMISSIONS,
} from './permission.constant';

describe('permission.constant', () => {
  describe('isPermission', () => {
    it('accepts every catalog code', () => {
      for (const code of PERMISSIONS) {
        expect(isPermission(code)).toBe(true);
      }
    });

    it('rejects an unknown code', () => {
      expect(isPermission('products.delete')).toBe(false);
    });
  });

  describe('expandPermissions', () => {
    it('adds same-scope view when a mutating action is granted', () => {
      expect(expandPermissions(['products.create'])).toEqual(
        expect.arrayContaining(['products.create', 'products.view']),
      );
    });

    it('adds the cross-scope implication for a form dependency', () => {
      // The product form's department/group/brand dropdowns need catalogs.view.
      expect(expandPermissions(['products.create'])).toEqual(
        expect.arrayContaining(['catalogs.view']),
      );
    });

    it('grants invoices.create the customer-step dependencies the sale flow actually needs (CustomerPicker, quick-create/update)', () => {
      const result = expandPermissions(['invoices.create']);
      expect(result).toEqual(
        expect.arrayContaining([
          'customers.view',
          'customers.create',
          'customers.update',
          'third_parties.view',
        ]),
      );
    });

    it('grants quotations.create the same customer-step dependencies as invoices.create', () => {
      const result = expandPermissions(['quotations.create']);
      expect(result).toEqual(
        expect.arrayContaining([
          'customers.view',
          'customers.create',
          'customers.update',
          'third_parties.view',
        ]),
      );
    });

    it('chains implications transitively (credit_notes.create -> credit_notes.view -> invoices.view)', () => {
      const result = expandPermissions(['credit_notes.create']);
      expect(result).toEqual(
        expect.arrayContaining([
          'credit_notes.create',
          'credit_notes.view',
          'invoices.view',
        ]),
      );
    });

    it('does not imply invoices.create from quotations.invoice — a deliberate independence', () => {
      const result = expandPermissions(['quotations.invoice']);
      expect(result).not.toContain('invoices.create');
      expect(result).toEqual(
        expect.arrayContaining(['quotations.invoice', 'quotations.view']),
      );
    });

    it('grants catalogs.view with catalogs.create and catalogs.update', () => {
      expect(expandPermissions(['catalogs.create'])).toEqual(
        expect.arrayContaining(['catalogs.create', 'catalogs.view']),
      );
      expect(expandPermissions(['catalogs.update'])).toEqual(
        expect.arrayContaining(['catalogs.update', 'catalogs.view']),
      );
    });

    it('is idempotent — expanding an already-expanded set changes nothing', () => {
      const once = expandPermissions(['invoices.create']);
      const twice = expandPermissions(once);
      expect(new Set(twice)).toEqual(new Set(once));
    });

    it('returns view-only permissions unchanged', () => {
      expect(expandPermissions(['products.view'])).toEqual(['products.view']);
    });

    it('deduplicates when two granted codes imply the same permission', () => {
      const result = expandPermissions(['products.create', 'products.update']);
      expect(result.filter((code) => code === 'products.view')).toHaveLength(1);
      expect(result.filter((code) => code === 'catalogs.view')).toHaveLength(1);
    });

    it('grants purchase_imports.create the view/product/catalog dependencies of the review screen', () => {
      expect(expandPermissions(['purchase_imports.create'])).toEqual(
        expect.arrayContaining([
          'purchase_imports.view',
          'products.view',
          'catalogs.view',
        ]),
      );
    });

    it('does not let purchase_imports.confirm imply create', () => {
      expect(expandPermissions(['purchase_imports.confirm'])).not.toContain(
        'purchase_imports.create',
      );
    });
  });
});
