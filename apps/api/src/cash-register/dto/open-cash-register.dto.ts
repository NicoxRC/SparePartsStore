import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @ApiProperty({
    description: 'Efectivo físico contado en caja al abrir ("base").',
  })
  @IsNumber()
  @Min(0)
  openingAmount: number;
}
