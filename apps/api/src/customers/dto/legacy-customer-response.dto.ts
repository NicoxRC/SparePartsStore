import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegacyCustomer } from '../entities/legacy-customer.entity';

/**
 * Same shape as the DIAN tercero lookup (ThirdPartyResponseDto) so the
 * sale form fills its fields from either one with the same code.
 */
export class LegacyCustomerResponseDto {
  @ApiProperty()
  identification: string;

  @ApiProperty({ example: 'CC' })
  identificationType: string;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  familyName?: string;

  @ApiPropertyOptional()
  secondLastName?: string;

  static fromEntity(legacy: LegacyCustomer): LegacyCustomerResponseDto {
    const dto = new LegacyCustomerResponseDto();
    dto.identification = legacy.identification;
    dto.identificationType = legacy.identificationType;
    dto.companyName = legacy.companyName ?? undefined;
    dto.firstName = legacy.firstName ?? undefined;
    dto.familyName = legacy.familyName ?? undefined;
    dto.secondLastName = legacy.secondLastName ?? undefined;
    return dto;
  }
}
