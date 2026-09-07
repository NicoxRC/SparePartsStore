import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Generic accrual/deduction line — confirmed codes so far (accruals):
 * BASICO, AUXILIO_DE_TRANSPORTE, BONIFICACION, OTRO_CONCEPTO, PRIMA,
 * CESANTIAS, VACACION, VACACION_COMPENSADA, AUXILIO, INCAPACIDAD;
 * (deductions): SALUD, FONDO_PENSION, FONDO_SOLIDARIDAD_PENSIONAL,
 * RETENCION_FUENTE, LIBRANZA, AFC, FONDO_SUBSISTENCIA,
 * PENSION_VOLUNTARIA, PAGO_TERCERO, OTRA_DEDUCCION. Kept as a free
 * string, not a locked enum — this app doesn't validate payroll business
 * rules (see docs/phases/PHASE_15_PAYROLL.md), it forwards figures
 * already calculated elsewhere.
 */
export class PayrollLineItemDto {
  @ApiProperty({ example: 'BASICO' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 1423500 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  days?: number;

  @ApiProperty({ required: false, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
