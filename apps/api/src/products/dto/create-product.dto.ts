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
  Min,
} from 'class-validator';
import { SaleType } from '../../common/enums/sale-type.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  reference: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) =>
    value
      ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      : value,
  )
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(500)
  salePrice: number;

  @IsEnum(SaleType)
  saleType: SaleType;

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
}
