import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class CreateCashMovementDto {
  @ApiProperty({
    description: 'Positivo = entrada, negativo = salida. Nunca cero.',
  })
  @IsNumber()
  @NotEquals(0)
  amount: number;

  @ApiProperty({ description: 'Motivo del movimiento — obligatorio.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
