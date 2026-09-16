import { ApiProperty } from '@nestjs/swagger';
import { CashRegister } from '../entities/cash-register.entity';

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
    dto.closedAt = register.closedAt ? register.closedAt.toISOString() : null;
    dto.closedById = register.closedBy?.id ?? null;
    dto.closedByName = register.closedBy
      ? `${register.closedBy.firstName} ${register.closedBy.lastName}`
      : null;
    dto.totalAmount = register.totalAmount;
    dto.totalOwed = register.totalOwed;
    dto.isOpen = register.closedAt === null;
    return dto;
  }
}
