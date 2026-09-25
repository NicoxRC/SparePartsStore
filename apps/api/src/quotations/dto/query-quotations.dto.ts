import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  QUOTATION_BORROWER_TYPES,
  type QuotationBorrowerType,
} from '../entities/quotation.entity';

export class QueryQuotationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ['open', 'invoiced', 'cancelled'] })
  @IsOptional()
  @IsIn(['open', 'invoiced', 'cancelled'])
  status?: 'open' | 'invoiced' | 'cancelled';

  @ApiPropertyOptional({
    description:
      'Matches quotation number or customer name/company/identification',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: QUOTATION_BORROWER_TYPES })
  @IsOptional()
  @IsIn(QUOTATION_BORROWER_TYPES)
  borrowerType?: QuotationBorrowerType;
}
