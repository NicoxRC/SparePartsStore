import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { DianResolutionDocumentType } from '../../../common/enums/dian-resolution-document-type.enum';

export class CreateResolutionDto {
  @ApiProperty({ enum: DianResolutionDocumentType })
  @IsEnum(DianResolutionDocumentType)
  documentType: DianResolutionDocumentType;

  @ApiProperty({ example: 'FE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  prefix: string;

  @ApiProperty({
    example: 'ELECTRONICO',
    description:
      'Only ELECTRONICO and POS are confirmed so far — see docs/phases/PHASE_8_RESOLUTIONS.md.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  subtype: string;

  @ApiProperty({ example: 'SDJ-002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resolutionCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  resolutionCodeMessage?: string;

  @ApiProperty({ example: '18764075467155' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resolutionNumber: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rangeStart: number;

  @ApiProperty({ example: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rangeEnd: number;

  @ApiProperty({
    required: false,
    description: 'Only used for documentType=invoice.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  technicalKey?: string;

  @ApiProperty({ example: '2024-07-21' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-07-21' })
  @IsDateString()
  endDate: string;
}
