import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  normalizeProductDescription,
  normalizeProductReference,
} from '../product-normalize.util';

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

  /** `null` clears the supplier tag; omitted leaves it untouched. */
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;
}
