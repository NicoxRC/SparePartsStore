import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

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
}
