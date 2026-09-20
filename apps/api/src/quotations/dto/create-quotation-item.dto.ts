import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * No `taxRate` field — same reasoning as CreateInvoiceItemDto: IVA is
 * never client-supplied, QuotationsService derives it from
 * `Product.taxExempt` via `resolveTaxRate()`.
 */
export class CreateQuotationItemDto {
  @ApiProperty({
    description:
      'An existing product id — reference/description/price are pulled from it',
  })
  @IsUUID()
  productId: string;

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
