import { ApiProperty } from '@nestjs/swagger';

/** A debit/credit note issued that store day — shown in the closing
 * report purely for visibility (see CashRegisterService.findNotesForDay).
 * Deliberately not folded into totalCash/totalCard/totalTransfer or
 * expectedCash — see the comment on CashRegister.totalCash for why. */
export class CashRegisterNoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['debit', 'credit'] })
  type: 'debit' | 'credit';

  @ApiProperty()
  number: number;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  invoiceNumber: number;

  @ApiProperty()
  invoicePrefix: string;

  @ApiProperty()
  createdAt: string;
}
