import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * No `taxRate` field — same reasoning as CreateInvoiceItemDto: IVA is
 * never client-supplied, QuotationsService derives it from
 * `Product.taxExempt` via `resolveTaxRate()`.
 */
export class CreateQuotationItemDto {
  @ApiPropertyOptional({
    description:
      'An existing product id — reference/description/price are pulled from it. Leave it out for a one-off line (then `description` and `customUnitPrice` are required).',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description:
      'A one-off line typed on the sale (not a catalog product, never saved as one). Required when there is no `productId`.',
  })
  @ValidateIf((line: { productId?: string }) => !line.productId)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 25000,
    description:
      'Price before IVA of a one-off line. Required when there is no `productId`. IVA (19%) is added on top like any other line.',
  })
  @ValidateIf((line: { productId?: string }) => !line.productId)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  customUnitPrice?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 20000,
    description:
      'Fixed COP amount, not a percentage — same semantics as CreateInvoiceItemDto.discount.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}
