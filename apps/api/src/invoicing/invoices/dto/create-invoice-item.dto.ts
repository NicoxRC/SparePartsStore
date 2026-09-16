import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

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

  @ApiProperty({
    example: 19,
    description:
      'IVA percentage for this line. Not defaulted server-side — the caller (form) suggests 19%, the standard Colombian rate, but this store may need to override it.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiPropertyOptional({
    example: 20000,
    description:
      'Fixed COP amount taken off this line\'s pre-tax subtotal (price × quantity) before computing IVA — not a percentage. Local-only: never sent to Dataico as its own field, it only changes the tax_base/tax_amount/price this app computes and sends (see docs/DATABASE.md\'s "invoices" table). Not part of the confirmed standard-invoice payload.',
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
