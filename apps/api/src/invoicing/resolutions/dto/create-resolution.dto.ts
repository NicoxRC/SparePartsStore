import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

  @ApiProperty({ example: 'SDJ-002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resolutionCode: string;

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

  @ApiProperty({ example: '2024-07-21' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-07-21' })
  @IsDateString()
  endDate: string;
}
