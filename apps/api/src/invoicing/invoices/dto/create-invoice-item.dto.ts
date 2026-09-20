import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * No `taxRate` field — IVA is never client-supplied. `InvoicesService.
 * resolveItems()` derives it itself from `Product.taxExempt` (see
 * `common/utils/invoice-math.util.ts`'s `resolveTaxRate()`), confirmed
 * directly: IVA must always be calculated the same way, never left to
 * whoever's filling out the sale form.
 */
export class CreateInvoiceItemDto {
  @ApiProperty({
    description:
      'An existing product id — sku/description/price are pulled from it',
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
      'Fixed COP amount taken off this line\'s pre-tax subtotal (price × quantity) before computing IVA — not a percentage. The client computes this per line by prorating a single invoice-level discount (% or COP value) the user enters once, not a per-line input anymore. Local-only: never sent to Dataico as its own field, it only changes the tax_base/tax_amount/price this app computes and sends (see docs/DATABASE.md\'s "invoices" table). Not part of the confirmed standard-invoice payload.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description:
      "Internal only — never sent by the Venta form. Set by QuotationsService.invoice() to lock the price a quotation was created/edited at, instead of using the product's current salePrice.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPriceOverride?: number;
}
