import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ClosePastCashRegisterDto {
  @ApiPropertyOptional({
    description:
      'Efectivo físico contado. Si se omite (no se contó en su momento), se toma el efectivo esperado y la caja queda sin desfase.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  countedCash?: number;
}
