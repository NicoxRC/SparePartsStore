import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ example: 1225 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ example: '2026-09-07' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2026-09-07' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({
    example: 'BANK_TRANSFER',
    description: 'Confirmed values so far: BANK_TRANSFER, CREDIT_TRANSFER.',
  })
  @IsString()
  @IsNotEmpty()
  paymentMeans: string;

  @ApiProperty({
    example: 'DEBITO',
    description: 'Confirmed values so far: DEBITO, CREDITO.',
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
