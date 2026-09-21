import {
  normalizeProductDescription,
  normalizeProductReference,
} from './product-normalize.util';

describe('product-normalize.util', () => {
  it('uppercases and trims a reference', () => {
    expect(normalizeProductReference('  ab-12 ')).toBe('AB-12');
  });

  it('capitalizes the first letter and lowercases the rest of a description', () => {
    expect(normalizeProductDescription('  FILTRO DE aceite ')).toBe(
      'Filtro de aceite',
    );
  });

  it('returns an empty string for a blank description', () => {
    expect(normalizeProductDescription('   ')).toBe('');
  });
});
