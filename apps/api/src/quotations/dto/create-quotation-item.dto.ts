import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

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

  @ApiProperty({ example: 19 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate: number;

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
