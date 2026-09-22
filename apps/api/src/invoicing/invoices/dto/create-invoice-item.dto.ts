import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
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
 * No `taxRate` field — IVA is never client-supplied. `InvoicesService.
 * resolveItems()` derives it itself from `Product.taxExempt` (see
 * `common/utils/invoice-math.util.ts`'s `resolveTaxRate()`), confirmed
 * directly: IVA must always be calculated the same way, never left to
 * whoever's filling out the sale form.
 */
export class CreateInvoiceItemDto {
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
      'Sale price of a one-off line, IVA included (like any product price). Required when there is no `productId`. The 19% IVA is broken out of it like any other line.',
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
      'Fixed COP amount taken off this line\'s final, IVA-included amount (price × quantity) — not a percentage. The client computes this per line by prorating a single invoice-level discount (% or COP value) the user enters once, not a per-line input anymore. Local-only: never sent to Dataico as its own field, it only changes the tax_base/tax_amount/price this app computes and sends (see docs/DATABASE.md\'s "invoices" table). Not part of the confirmed standard-invoice payload.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 45000,
    description:
      "Charges this line at a different price than `product.salePrice`, for this sale only — the product's own catalog price is never touched. Sent by the Venta form when staff edits a line's price, and internally by QuotationsService.invoice() to lock in the price a quotation was created/edited at.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(500)
  unitPriceOverride?: number;
}
