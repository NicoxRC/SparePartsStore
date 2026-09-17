import { ApiProperty } from '@nestjs/swagger';
import { CashRegisterResponseDto } from './cash-register-response.dto';

/**
 * What the invoicing pages poll on load to decide whether to show the
 * "abrir caja" gate. `totalSoFar`/`totalOwedSoFar` are live, unpersisted
 * previews of what closing right now would record — populated only while
 * `isOpen`, so the close-confirmation UI can show numbers before the
 * actual close call. `totalSoFar` is what's been collected (sent
 * invoices) today; `totalOwedSoFar` is what's still owed from quotations
 * opened today and not yet invoiced/cancelled — never a prior day's debt.
 */
export class CashRegisterStatusDto {
  @ApiProperty()
  isOpen: boolean;

  @ApiProperty({ type: CashRegisterResponseDto, nullable: true })
  register: CashRegisterResponseDto | null;

  @ApiProperty({ nullable: true })
  totalSoFar: number | null;

  @ApiProperty({ nullable: true })
  totalOwedSoFar: number | null;
}
