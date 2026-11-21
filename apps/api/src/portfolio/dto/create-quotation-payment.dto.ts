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

export const PAYMENT_MEANS_VALUES = ['CASH', 'CARD', 'BANK_TRANSFER'] as const;

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
  @IsIn(PAYMENT_MEANS_VALUES)
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
