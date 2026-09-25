import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  QUOTATION_BORROWER_TYPES,
  type QuotationBorrowerType,
} from '../entities/quotation.entity';
import { CreateQuotationItemDto } from './create-quotation-item.dto';

/** The invoice data is only required when lending to an almacén. */
const needsInvoiceData = (dto: CreateQuotationDto) =>
  dto.borrowerType !== 'empleado';

export class CreateQuotationDto {
  @ApiPropertyOptional({
    enum: QUOTATION_BORROWER_TYPES,
    default: 'almacen',
    description:
      'almacen: a business, every invoice-data field below is required. empleado: a person, only customerFirstName is required.',
  })
  @IsOptional()
  @IsIn(QUOTATION_BORROWER_TYPES)
  borrowerType?: QuotationBorrowerType;

  @ApiProperty({ example: 'NIT' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerIdentificationType?: string;

  @ApiProperty({ example: '830033494' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerIdentification?: string;

  @ApiPropertyOptional({ description: 'NIT check digit — local-only.' })
  @IsOptional()
  @IsString()
  customerIdentificationDv?: string;

  @ApiProperty({ example: 'PERSONA_JURIDICA' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerPartyType?: string;

  @ApiProperty({ example: 'COMUN' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerTaxLevelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerRegimen?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_JURIDICA.' })
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiPropertyOptional({
    description: 'Required for PERSONA_NATURAL, and for an empleado.',
  })
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_NATURAL.' })
  @IsOptional()
  @IsString()
  customerFamilyName?: string;

  @ApiProperty({ example: 'CO', default: 'CO' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerCountryCode?: string;

  @ApiProperty({ example: '11', description: 'DANE department code.' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerDepartment?: string;

  @ApiProperty({ example: '001', description: 'DANE city code.' })
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerCity?: string;

  @ApiProperty()
  @ValidateIf(needsInvoiceData)
  @IsString()
  @IsNotEmpty()
  customerAddressLine?: string;

  @ApiProperty()
  @ValidateIf(needsInvoiceData)
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ type: [CreateQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
