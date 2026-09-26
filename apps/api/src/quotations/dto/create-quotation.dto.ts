import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateQuotationItemDto } from './create-quotation-item.dto';

export class CreateQuotationDto {
  @ApiProperty({ example: 'NIT' })
  @IsString()
  @IsNotEmpty()
  customerIdentificationType: string;

  @ApiProperty({ example: '830033494' })
  @IsString()
  @IsNotEmpty()
  customerIdentification: string;

  @ApiPropertyOptional({ description: 'NIT check digit — local-only.' })
  @IsOptional()
  @IsString()
  customerIdentificationDv?: string;

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

  @ApiPropertyOptional({ description: 'Required for PERSONA_JURIDICA.' })
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_NATURAL.' })
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_NATURAL.' })
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
