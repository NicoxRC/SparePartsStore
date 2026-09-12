import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'NIT' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  identificationType: string;

  @ApiProperty({ example: '830033494' })
  @IsString()
  @IsNotEmpty()
  identification: string;

  @ApiProperty({
    example: 'PERSONA_JURIDICA',
    enum: ['PERSONA_JURIDICA', 'PERSONA_NATURAL'],
  })
  @IsIn(['PERSONA_JURIDICA', 'PERSONA_NATURAL'])
  partyType: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_JURIDICA.' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_NATURAL.' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Required for PERSONA_NATURAL.' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ example: 'COMUN' })
  @IsOptional()
  @IsString()
  taxLevelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regimen?: string;

  @ApiPropertyOptional({ example: 'CO', default: 'CO' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: '11', description: 'DANE department code.' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: '001', description: 'DANE city code.' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  responsableIva?: boolean;
}
