import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import {
  normalizeProductDescription,
  normalizeProductReference,
} from '../product-normalize.util';
import { SaleType } from '../../common/enums/sale-type.enum';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductReference(value) : value,
  )
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductDescription(value) : value,
  )
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(500)
  salePrice?: number;

  /** Recomputes the cost of an "INVENTARIO INICIAL" product; ignored otherwise. */
  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  /** The cost of a product with a real supplier; ignored for "INVENTARIO INICIAL", whose cost is derived. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  /** `null` moves the product back to "INVENTARIO INICIAL"; omitted leaves it untouched. */
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  /** `null` removes the photo; omitted leaves it untouched. */
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  imageUrl?: string | null;
}
