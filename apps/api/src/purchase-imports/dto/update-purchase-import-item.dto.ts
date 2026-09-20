import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { SaleType } from '../../common/enums/sale-type.enum';
import {
  normalizeProductDescription,
  normalizeProductReference,
} from '../../products/product-normalize.util';
import { MIN_NEW_PRODUCT_SALE_PRICE } from '../purchase-import-validation';

/** Every field optional; unknown fields are rejected by the global pipe. */
export class UpdatePurchaseImportItemDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductReference(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductDescription(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'uuid = link manually to an existing product; null = remove the manual link and re-run the exact match',
  })
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: MIN_NEW_PRODUCT_SALE_PRICE })
  @IsOptional()
  @IsInt()
  @Min(MIN_NEW_PRODUCT_SALE_PRICE)
  salePrice?: number | null;

  @ApiPropertyOptional({ enum: SaleType })
  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;
}
