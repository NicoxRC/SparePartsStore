import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Only used when invoicing a quotation "a nombre de otro cliente". */
export class InvoiceQuotationCustomerDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerRegimen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerFamilyName?: string;

  @ApiProperty({ example: 'CO' })
  @IsString()
  @IsNotEmpty()
  customerCountryCode: string;

  @ApiProperty({ example: '11' })
  @IsString()
  @IsNotEmpty()
  customerDepartment: string;

  @ApiProperty({ example: '001' })
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
}

export class InvoiceQuotationDto {
  @ApiPropertyOptional({
    description:
      'Only meaningful when paymentMeansType is CREDITO — defaults to today otherwise.',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ example: 'CASH' })
  @IsString()
  @IsNotEmpty()
  paymentMeans: string;

  @ApiProperty({ example: 'DEBITO' })
  @IsString()
  @IsNotEmpty()
  paymentMeansType: string;

  @ApiProperty({
    description:
      'true = bill to the same customer data already on the quotation. false = bill to `customer` instead.',
  })
  @IsBoolean()
  useSameCustomer: boolean;

  @ApiPropertyOptional({
    type: InvoiceQuotationCustomerDto,
    description: 'Required when useSameCustomer is false.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceQuotationCustomerDto)
  customer?: InvoiceQuotationCustomerDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];
}
