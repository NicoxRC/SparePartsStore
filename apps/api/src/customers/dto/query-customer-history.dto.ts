import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryCustomerHistoryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Inclusive lower bound (store calendar day).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Inclusive upper bound (store calendar day).',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
