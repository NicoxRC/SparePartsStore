import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

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
}
