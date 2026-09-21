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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductReference(value) : value,
  )
  reference: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeProductDescription(value) : value,
  )
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(500)
  salePrice: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @IsUUID()
  departmentId: string;

  @IsUUID()
  groupId: string;

  @IsUUID()
  brandId: string;

  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
