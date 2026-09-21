import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const PURCHASE_IMPORT_STATUSES = [
  'draft',
  'confirmed',
  'discarded',
] as const;
export type PurchaseImportStatus = (typeof PURCHASE_IMPORT_STATUSES)[number];

export class QueryPurchaseImportsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: PURCHASE_IMPORT_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_IMPORT_STATUSES)
  status?: PurchaseImportStatus;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Invoice number or supplier name' })
  @IsOptional()
  @IsString()
  search?: string;
}
