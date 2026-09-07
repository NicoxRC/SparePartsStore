import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePosInvoiceItemDto } from './create-pos-invoice-item.dto';

export class CreatePosInvoiceDto {
  @ApiProperty({ example: 300002 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ example: '2026-09-07' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({
    example: 'CASH',
    description: 'Confirmed value so far: CASH.',
  })
  @IsString()
  @IsNotEmpty()
  paymentMeansCode: string;

  @ApiProperty({
    example: 'DEBITO',
    description: 'Confirmed value so far: DEBITO.',
  })
  @IsString()
  @IsNotEmpty()
  paymentMeansType: string;

  @ApiProperty({ example: 'NATURAL' })
  @IsString()
  @IsNotEmpty()
  customerType: string;

  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty()
  customerIdentificationType: string;

  @ApiProperty({ example: '11111' })
  @IsString()
  @IsNotEmpty()
  customerIdentification: string;

  @ApiProperty({ required: false, description: 'Required for JURIDICA.' })
  @IsOptional()
  @IsString()
  customerCompanyName?: string;

  @ApiProperty({ required: false, description: 'Required for NATURAL.' })
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiProperty({ required: false, description: 'Required for NATURAL.' })
  @IsOptional()
  @IsString()
  customerFamilyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty()
  @IsEmail()
  customerEmail: string;

  @ApiProperty({
    default: false,
    description:
      'DIAN "responsable de IVA" flag, confirmed on the customer object.',
  })
  @IsBoolean()
  responsableIva: boolean;

  @ApiProperty({ type: [CreatePosInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePosInvoiceItemDto)
  items: CreatePosInvoiceItemDto[];
}
