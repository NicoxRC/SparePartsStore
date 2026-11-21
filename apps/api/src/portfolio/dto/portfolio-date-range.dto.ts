import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Which quotations count, by the store day they were made — both ends optional. */
export class PortfolioDateRangeDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description:
      'Inclusive lower bound on the day the quotation was made (store calendar day).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Inclusive upper bound on the day the quotation was made (store calendar day).',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
