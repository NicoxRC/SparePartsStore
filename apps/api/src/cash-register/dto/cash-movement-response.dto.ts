import { ApiProperty } from '@nestjs/swagger';
import { CashMovement } from '../entities/cash-movement.entity';

export class CashMovementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Positivo = entrada, negativo = salida.' })
  amount: number;

  @ApiProperty()
  reason: string;

  @ApiProperty({ nullable: true })
  createdById: string | null;

  @ApiProperty({ nullable: true })
  createdByName: string | null;

  @ApiProperty()
  createdAt: string;

  static fromEntity(movement: CashMovement): CashMovementResponseDto {
    const dto = new CashMovementResponseDto();
    dto.id = movement.id;
    dto.amount = movement.amount;
    dto.reason = movement.reason;
    dto.createdById = movement.createdBy?.id ?? null;
    dto.createdByName = movement.createdBy
      ? `${movement.createdBy.firstName} ${movement.createdBy.lastName}`
      : null;
    dto.createdAt = movement.createdAt.toISOString();
    return dto;
  }
}
