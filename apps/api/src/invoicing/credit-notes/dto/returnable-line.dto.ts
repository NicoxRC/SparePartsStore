import { ApiProperty } from '@nestjs/swagger';

/** A line of an invoice and how much of it can still be credited. */
export class ReturnableLineDto {
  @ApiProperty() sku: string;
  @ApiProperty() description: string;
  @ApiProperty({
    description: 'Pre-tax, post-discount unit price exactly as invoiced.',
  })
  unitPrice: number;
  @ApiProperty({ description: 'IVA rate charged on the line (0 if none).' })
  taxRate: number;
  @ApiProperty() invoicedQuantity: number;
  @ApiProperty({
    description:
      'Invoiced quantity minus what earlier credit notes already returned.',
  })
  returnableQuantity: number;
}
