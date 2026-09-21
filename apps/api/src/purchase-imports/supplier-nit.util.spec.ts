import { parseNit } from './supplier-nit.util';

describe('parseNit', () => {
  it('strips dots and spaces', () => {
    expect(parseNit('900.123.456')).toEqual({ nit: '900123456', dv: null });
  });

  it('splits an inline check digit', () => {
    expect(parseNit('900.123.456-7')).toEqual({ nit: '900123456', dv: '7' });
  });

  it('takes the check digit from a numeric schemeID', () => {
    expect(parseNit('900123456', '7')).toEqual({ nit: '900123456', dv: '7' });
  });

  it('ignores a non-digit schemeID', () => {
    expect(parseNit('900123456', 'NIT')?.dv).toBeNull();
  });

  it('keeps leading zeros', () => {
    expect(parseNit('0012345')?.nit).toBe('0012345');
  });

  it.each([null, '', 'abc', '1'.repeat(21)])('rejects %p', (raw) => {
    expect(parseNit(raw)).toBeNull();
  });
});
