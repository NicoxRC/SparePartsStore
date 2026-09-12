import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ResendInvoiceDto {
  @ApiProperty({
    default: true,
    required: false,
    description:
      'Resubmit to DIAN. Defaults to true — the usual reason to resend is a prior DIAN submission failure.',
  })
  @IsOptional()
  @IsBoolean()
  sendDian?: boolean = true;

  @ApiProperty({
    default: false,
    required: false,
    description: 'Re-send the customer notification email.',
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;
}
