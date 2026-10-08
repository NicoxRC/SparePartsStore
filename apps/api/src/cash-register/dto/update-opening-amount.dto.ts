import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

/** Body for correcting a register's opening cash ("base") — see
 * `CashRegisterService.updateOpeningAmount`. */
export class UpdateOpeningAmountDto {
  @ApiProperty({ description: 'Base (efectivo al abrir), corregida.' })
  @IsNumber()
  @Min(0)
  openingAmount: number;
}
