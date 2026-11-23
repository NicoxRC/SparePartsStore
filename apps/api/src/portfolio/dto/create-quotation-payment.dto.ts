import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Abonos are taken in cash or by transfer only (decided with the store).
 * Older abonos may still say CARD.
 */
export const PAYMENT_MEANS_VALUES = ['CASH', 'BANK_TRANSFER'] as const;

export class CreateQuotationPaymentDto {
  @ApiProperty({
    example: 50000,
    description:
      'COP, at most the quotation’s pending balance. Paying exactly the balance completes the quotation.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PAYMENT_MEANS_VALUES, example: 'CASH' })
  @IsIn(PAYMENT_MEANS_VALUES, {
    message: 'El abono es en efectivo o por transferencia.',
  })
  paymentMeans: (typeof PAYMENT_MEANS_VALUES)[number];

  @ApiPropertyOptional({ example: 'Pagó la mitad, el resto el viernes' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(500)
  notes?: string;
}
