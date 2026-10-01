import { toLegacyCustomerRow } from './legacy-customer-row';

describe('toLegacyCustomerRow', () => {
  it('maps a cédula with both names and both surnames', () => {
    expect(
      toLegacyCustomerRow([13, 1085000001, 'pérez', 'gómez', 'juan', 'carlos']),
    ).toEqual({
      identificationType: 'CC',
      identification: '1085000001',
      companyName: null,
      firstName: 'JUAN CARLOS',
      familyName: 'PÉREZ',
      secondLastName: 'GÓMEZ',
    });
  });

  it('maps a NIT with its razón social', () => {
    expect(
      toLegacyCustomerRow([
        '31',
        900000001,
        null,
        null,
        null,
        null,
        ' Repuestos  Ejemplo SAS ',
      ]),
    ).toEqual({
      identificationType: 'NIT',
      identification: '900000001',
      companyName: 'REPUESTOS EJEMPLO SAS',
      firstName: null,
      familyName: null,
      secondLastName: null,
    });
  });

  it('skips a document type the sale form has no option for', () => {
    expect(
      toLegacyCustomerRow([43, 444444001, null, null, null, null, 'X']),
    ).toBeNull();
  });

  it('skips a row without a number', () => {
    expect(toLegacyCustomerRow([13, null, 'PÉREZ'])).toBeNull();
  });
});
