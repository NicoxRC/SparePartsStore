import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PayrollEmployeeDto } from './payroll-employee.dto';
import { PayrollLineItemDto } from './payroll-line-item.dto';

export class CreatePayrollEntryDto {
  @ApiProperty({ example: 'N' })
  @IsString()
  @IsNotEmpty()
  prefix: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ example: 1423500 })
  @Type(() => Number)
  @IsNumber()
  salary: number;

  @ApiProperty({ example: 'MENSUAL' })
  @IsString()
  @IsNotEmpty()
  periodicity: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsString()
  @IsNotEmpty()
  initialSettlementDate: string;

  @ApiProperty({ example: '2025-10-31' })
  @IsString()
  @IsNotEmpty()
  finalSettlementDate: string;

  @ApiProperty({ example: '2026-09-07' })
  @IsString()
  @IsNotEmpty()
  issueDate: string;

  @ApiProperty({ example: '2025-10-31' })
  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];

  @ApiProperty({ type: [PayrollLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayrollLineItemDto)
  accruals: PayrollLineItemDto[];

  @ApiProperty({ type: [PayrollLineItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollLineItemDto)
  deductions?: PayrollLineItemDto[];

  @ApiProperty({ type: PayrollEmployeeDto })
  @ValidateNested()
  @Type(() => PayrollEmployeeDto)
  employee: PayrollEmployeeDto;
}
