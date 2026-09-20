import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

/**
 * No `taxRate` field — IVA is never client-supplied, same reasoning as
 * CreateInvoiceItemDto: DebitNotesService derives it from
 * `Product.taxExempt` via `resolveTaxRate()`.
 */
export class CreateDebitNoteItemDto {
  @ApiProperty({
    description:
      'An existing product id — sku/description/price are pulled from it, same as an invoice line.',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
