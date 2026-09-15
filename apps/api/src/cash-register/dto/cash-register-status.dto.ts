import { ApiProperty } from '@nestjs/swagger';
import { CashRegisterResponseDto } from './cash-register-response.dto';

/**
 * What the invoicing pages poll on load to decide whether to show the
 * "abrir caja" gate. `totalSoFar` is a live, unpersisted preview of what
 * closing right now would record — populated only while `isOpen`, so the
 * close-confirmation UI can show a number before the actual close call.
 */
export class CashRegisterStatusDto {
  @ApiProperty()
  isOpen: boolean;

  @ApiProperty({ type: CashRegisterResponseDto, nullable: true })
  register: CashRegisterResponseDto | null;

  @ApiProperty({ nullable: true })
  totalSoFar: number | null;
}
