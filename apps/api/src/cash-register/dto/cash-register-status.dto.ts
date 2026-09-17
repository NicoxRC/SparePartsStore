import { ApiProperty } from '@nestjs/swagger';
import { CashRegisterResponseDto } from './cash-register-response.dto';

/**
 * What the invoicing pages poll on load to decide whether to show the
 * "abrir caja" gate. `totalSoFar`/`totalOwedSoFar`/`expectedCashSoFar` are
 * live, unpersisted previews of what closing right now would record —
 * populated only while `isOpen`, so the close-confirmation UI can show
 * numbers before the actual close call. `totalSoFar` is what's been
 * collected (sent invoices) today; `totalOwedSoFar` is what's still owed
 * from quotations opened today and not yet invoiced/cancelled — never a
 * prior day's debt; `expectedCashSoFar` is what should physically be in
 * the drawer right now (openingAmount + cash sales so far + net cash
 * movements so far). `previousClosingCash` is only populated while
 * `!isOpen` and a prior day was closed — the last counted cash, meant for
 * the frontend to show as a placeholder (never a pre-filled value) on the
 * "abrir caja" opening-amount input, since the store's actual cash on hand
 * must be re-counted, not assumed unchanged overnight.
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

  @ApiProperty({ nullable: true })
  expectedCashSoFar: number | null;

  @ApiProperty({ nullable: true })
  previousClosingCash: number | null;
}
