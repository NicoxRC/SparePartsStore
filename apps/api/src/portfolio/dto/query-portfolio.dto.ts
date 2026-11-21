import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PortfolioDateRangeDto } from './portfolio-date-range.dto';

export class QueryPortfolioDto extends PortfolioDateRangeDto {
  @ApiPropertyOptional({
    description:
      "Digits alone match the customer's identification by prefix; anything else matches the name word by word, ignoring accents.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: ['empresa', 'empleado'],
    description: 'NIT is an empresa, anything else (cédula) an empleado.',
  })
  @IsOptional()
  @IsIn(['empresa', 'empleado'])
  customerType?: 'empresa' | 'empleado';
}
