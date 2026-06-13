import { Transform, Type } from 'class-transformer';
import {
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

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) =>
    value
      ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      : value,
  )
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(500)
  salePrice?: number;

  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

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
}
