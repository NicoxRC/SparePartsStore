import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ResendInvoiceDto {
  @ApiProperty({
    default: true,
    required: false,
    description:
      'Resubmit to DIAN. Defaults to true — the usual reason to resend is a prior DIAN submission failure. Ignored (never sent) while DATAICO_SEND_DIAN is not true.',
  })
  @IsOptional()
  @IsBoolean()
  sendDian?: boolean;

  @ApiProperty({
    default: false,
    required: false,
    description:
      'Re-send the customer notification email. Ignored (never sent) while DATAICO_SEND_EMAIL is not true.',
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
