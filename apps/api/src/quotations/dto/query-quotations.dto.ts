import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @ApiPropertyOptional({
    enum: ['empresa', 'empleado'],
    description:
      'Derived from the identification type: NIT is an empresa, anything else (cédula) an empleado.',
  })
  @IsOptional()
  @IsIn(['empresa', 'empleado'])
  customerType?: 'empresa' | 'empleado';
}
