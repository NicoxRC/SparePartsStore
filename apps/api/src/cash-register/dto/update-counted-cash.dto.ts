import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

/** Body for correcting an already-closed day's counted cash — see
 * `CashRegisterService.updateCountedCash`. */
export class UpdateCountedCashDto {
  @ApiProperty({ description: 'Efectivo físico contado, corregido.' })
  @IsNumber()
  @Min(0)
  countedCash: number;
}
