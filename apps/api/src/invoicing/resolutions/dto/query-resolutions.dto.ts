import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DianResolutionDocumentType } from '../../../common/enums/dian-resolution-document-type.enum';

export class QueryResolutionsDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiProperty({ required: false, enum: DianResolutionDocumentType })
  @IsOptional()
  @IsEnum(DianResolutionDocumentType)
  documentType?: DianResolutionDocumentType;
}
