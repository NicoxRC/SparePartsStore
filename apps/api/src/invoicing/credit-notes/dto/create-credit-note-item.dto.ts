import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/**
 * A line of the original invoice to return, identified by the `sku` it was
 * invoiced with. No price or `taxRate` field — CreditNotesService credits
 * the price and IVA the invoice itself charged, never client-supplied.
 */
export class CreateCreditNoteItemDto {
  @ApiProperty({
    description:
      'The sku (product reference) of a line on the original invoice.',
    example: 'REP-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
