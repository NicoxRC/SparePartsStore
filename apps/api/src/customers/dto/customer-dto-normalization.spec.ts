import { plainToInstance } from 'class-transformer';
import { CreateCustomerDto } from './create-customer.dto';
import { UpdateCustomerDto } from './update-customer.dto';

describe('customer DTO normalization', () => {
  it('uppercases names and lowercases + trims email on create', () => {
    const dto = plainToInstance(CreateCustomerDto, {
      companyName: 'Repuestos del Norte S.A.S',
      firstName: 'Juan Pérez',
      familyName: 'gómez',
      email: '  Ventas@Norte.COM ',
    });

    expect(dto.companyName).toBe('REPUESTOS DEL NORTE S.A.S');
    expect(dto.firstName).toBe('JUAN PÉREZ');
    expect(dto.familyName).toBe('GÓMEZ');
    expect(dto.email).toBe('ventas@norte.com');
  });

  it('applies the same rules on update and leaves absent fields untouched', () => {
    const dto = plainToInstance(UpdateCustomerDto, {
      companyName: 'Taller Central',
      email: 'INFO@Taller.com',
    });

    expect(dto.companyName).toBe('TALLER CENTRAL');
    expect(dto.email).toBe('info@taller.com');
    expect(dto.firstName).toBeUndefined();
  });
});
