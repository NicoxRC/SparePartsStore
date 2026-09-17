import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

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

  @ApiProperty({
    example: 19,
    description:
      'IVA percentage for this line — same convention as invoice items.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate: number;
}
