import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateQuotationDto } from './create-quotation.dto';

const failedFields = (plain: object) =>
  validateSync(plainToInstance(CreateQuotationDto, plain)).map(
    (error) => error.property,
  );

const items = [
  { productId: '7d6f0a55-3c77-4a3b-9a3e-6c1b1c7d2f10', quantity: 1 },
];

describe('CreateQuotationDto', () => {
  it('requires the invoice data for an almacén quotation (the default)', () => {
    expect(failedFields({ items })).toEqual(
      expect.arrayContaining([
        'customerIdentification',
        'customerAddressLine',
        'customerEmail',
      ]),
    );
    expect(failedFields({ borrowerType: 'almacen', items })).toContain(
      'customerEmail',
    );
  });

  it('does not require invoice data for an empleado quotation', () => {
    expect(
      failedFields({
        borrowerType: 'empleado',
        customerFirstName: 'Jose',
        items,
      }),
    ).toEqual([]);
  });

  it('rejects an unknown borrower type', () => {
    expect(
      failedFields({
        borrowerType: 'cliente',
        customerFirstName: 'Jose',
        items,
      }),
    ).toContain('borrowerType');
  });
});
