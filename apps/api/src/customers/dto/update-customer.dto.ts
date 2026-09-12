import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'NIT' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  identificationType?: string;

  @ApiPropertyOptional({ example: '830033494' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  identification?: string;

  @ApiPropertyOptional({
    example: 'PERSONA_JURIDICA',
    enum: ['PERSONA_JURIDICA', 'PERSONA_NATURAL'],
  })
  @IsOptional()
  @IsIn(['PERSONA_JURIDICA', 'PERSONA_NATURAL'])
  partyType?: string;

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

  @ApiPropertyOptional({ example: 'CO' })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  responsableIva?: boolean;
}
