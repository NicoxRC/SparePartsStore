import { ApiProperty } from '@nestjs/swagger';
import { CashRegister } from '../entities/cash-register.entity';
import { CashMovementResponseDto } from './cash-movement-response.dto';

export class CashRegisterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registerDate: string;

  @ApiProperty()
  openedAt: string;

  @ApiProperty({ nullable: true })
  openedById: string | null;

  @ApiProperty({ nullable: true })
  openedByName: string | null;

  @ApiProperty({ description: 'Efectivo contado en caja al abrir ("base").' })
  openingAmount: number;

  @ApiProperty({ nullable: true })
  closedAt: string | null;

  @ApiProperty({ nullable: true })
  closedById: string | null;

  @ApiProperty({ nullable: true })
  closedByName: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Recaudado — sum of invoices sent that day.',
  })
  totalAmount: number | null;

  @ApiProperty({
    nullable: true,
    description:
      "Adeudado — sum of that day's quotations still open (not invoiced/cancelled) at close time.",
  })
  totalOwed: number | null;

  @ApiProperty({ nullable: true, description: 'totalAmount paid in cash.' })
  totalCash: number | null;

  @ApiProperty({ nullable: true, description: 'totalAmount paid by card.' })
  totalCard: number | null;

  @ApiProperty({ nullable: true, description: 'totalAmount paid by transfer.' })
  totalTransfer: number | null;

  @ApiProperty({
    nullable: true,
    description: 'openingAmount + totalCash + net cash movements.',
  })
  expectedCash: number | null;

  @ApiProperty({ nullable: true, description: 'Physically counted at close.' })
  countedCash: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'countedCash - expectedCash. Positive = surplus, negative = missing.',
  })
  cashDiscrepancy: number | null;

  @ApiProperty({ type: [CashMovementResponseDto] })
  movements: CashMovementResponseDto[];

  @ApiProperty()
  isOpen: boolean;

  static fromEntity(register: CashRegister): CashRegisterResponseDto {
    const dto = new CashRegisterResponseDto();
    dto.id = register.id;
    dto.registerDate = register.registerDate;
    dto.openedAt = register.openedAt.toISOString();
    dto.openedById = register.openedBy?.id ?? null;
    dto.openedByName = register.openedBy
      ? `${register.openedBy.firstName} ${register.openedBy.lastName}`
      : null;
    dto.openingAmount = register.openingAmount;
    dto.closedAt = register.closedAt ? register.closedAt.toISOString() : null;
    dto.closedById = register.closedBy?.id ?? null;
    dto.closedByName = register.closedBy
      ? `${register.closedBy.firstName} ${register.closedBy.lastName}`
      : null;
    dto.totalAmount = register.totalAmount;
    dto.totalOwed = register.totalOwed;
    dto.totalCash = register.totalCash;
    dto.totalCard = register.totalCard;
    dto.totalTransfer = register.totalTransfer;
    dto.expectedCash = register.expectedCash;
    dto.countedCash = register.countedCash;
    dto.cashDiscrepancy = register.cashDiscrepancy;
    dto.movements = (register.movements ?? []).map((movement) =>
      CashMovementResponseDto.fromEntity(movement),
    );
    dto.isOpen = register.closedAt === null;
    return dto;
  }
}
