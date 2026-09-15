import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({
    example: '2026-09-07',
    required: false,
    description:
      'Only meaningful when paymentMeansType is CREDITO — when it will actually be paid. Omitted otherwise, and defaults to the same day as issueDate.',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({
    example: 'CASH',
    description:
      'Only BANK_TRANSFER is confirmed against a real Dataico standard-invoice example. CASH/CARD are a best-effort mapping (not yet confirmed against Dataico) — see docs/phases/PHASE_10_INVOICING_STANDARD.md.',
  })
  @IsString()
  @IsNotEmpty()
  paymentMeans: string;

  @ApiProperty({
    example: 'DEBITO',
    description:
      'Only DEBITO is confirmed against a real Dataico standard-invoice example. CREDITO is not yet confirmed — see docs/phases/PHASE_10_INVOICING_STANDARD.md.',
  })
  @IsString()
  @IsNotEmpty()
  paymentMeansType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orderReference?: string;

  @ApiProperty({ example: 'NIT' })
  @IsString()
  @IsNotEmpty()
  customerIdentificationType: string;

  @ApiProperty({ example: '830033494' })
  @IsString()
  @IsNotEmpty()
  customerIdentification: string;

  @ApiProperty({ example: 'PERSONA_JURIDICA' })
  @IsString()
  @IsNotEmpty()
  customerPartyType: string;

  @ApiProperty({ example: 'COMUN' })
  @IsString()
  @IsNotEmpty()
  customerTaxLevelCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerRegimen?: string;

  @ApiProperty({
    required: false,
    description: 'Required for PERSONA_JURIDICA.',
  })
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiProperty({
    required: false,
    description: 'Required for PERSONA_NATURAL.',
  })
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiProperty({
    required: false,
    description: 'Required for PERSONA_NATURAL.',
  })
  @IsOptional()
  @IsString()
  customerFamilyName?: string;

  @ApiProperty({ example: 'CO', default: 'CO' })
  @IsString()
  @IsNotEmpty()
  customerCountryCode: string;

  @ApiProperty({ example: '11', description: 'DANE department code.' })
  @IsString()
  @IsNotEmpty()
  customerDepartment: string;

  @ApiProperty({ example: '001', description: 'DANE city code.' })
  @IsString()
  @IsNotEmpty()
  customerCity: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerAddressLine: string;

  @ApiProperty()
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];
}
