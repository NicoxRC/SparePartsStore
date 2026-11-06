import { ApiProperty } from '@nestjs/swagger';

export class OpenQuotationsSummaryDto {
  @ApiProperty({
    description: 'Sum of total_amount over every open quotation, any day.',
  })
  total: number;

  @ApiProperty({ description: 'How many quotations are still open.' })
  count: number;
}
