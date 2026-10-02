import {
  normalizeProductDescription,
  normalizeProductReference,
  stripAccents,
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

  it('removes accents and diaeresis but keeps the Ñ', () => {
    expect(stripAccents('Válvula ÉLÍÓÚ güero PIÑÓN piñón')).toBe(
      'Valvula ELIOU guero PIÑON piñon',
    );
  });

  it('strips accents from references and descriptions', () => {
    expect(normalizeProductReference(' áb-ñ1 ')).toBe('AB-Ñ1');
    expect(normalizeProductDescription('ÁMORTIGUADOR TRASERO PIÑÓN')).toBe(
      'Amortiguador trasero piñon',
    );
  });
});
