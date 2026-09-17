import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CloseCashRegisterDto {
  @ApiProperty({ description: 'Efectivo físico contado en caja al cerrar.' })
  @IsNumber()
  @Min(0)
  countedCash: number;
}
