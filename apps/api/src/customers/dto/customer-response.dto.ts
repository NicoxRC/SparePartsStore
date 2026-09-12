import { Customer } from '../entities/customer.entity';

export class CustomerResponseDto {
  id: string;
  identificationType: string;
  identification: string;
  partyType: string;
  companyName: string | null;
  firstName: string | null;
  familyName: string | null;
  taxLevelCode: string | null;
  regimen: string | null;
  countryCode: string | null;
  department: string | null;
  city: string | null;
  addressLine: string | null;
  email: string;
  phone: string | null;
  responsableIva: boolean;
  createdAt: string;
  updatedAt: string;

  static fromEntity(customer: Customer): CustomerResponseDto {
    const dto = new CustomerResponseDto();
    dto.id = customer.id;
    dto.identificationType = customer.identificationType;
    dto.identification = customer.identification;
    dto.partyType = customer.partyType;
    dto.companyName = customer.companyName;
    dto.firstName = customer.firstName;
    dto.familyName = customer.familyName;
    dto.taxLevelCode = customer.taxLevelCode;
    dto.regimen = customer.regimen;
    dto.countryCode = customer.countryCode;
    dto.department = customer.department;
    dto.city = customer.city;
    dto.addressLine = customer.addressLine;
    dto.email = customer.email;
    dto.phone = customer.phone;
    dto.responsableIva = customer.responsableIva;
    dto.createdAt = customer.createdAt.toISOString();
    dto.updatedAt = customer.updatedAt.toISOString();
    return dto;
  }
}
