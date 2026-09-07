import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PayrollEmployeeAddressDto } from './payroll-employee-address.dto';

export class PayrollEmployeeDto {
  @ApiProperty({ example: 'CEDULA_DE_CIUDADANIA' })
  @IsString()
  @IsNotEmpty()
  identificationType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  identification: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherNames?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secondLastName?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  integralSalary: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  highRisk: boolean;

  @ApiProperty({ example: '2025-10-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: 'DEPENDIENTE' })
  @IsString()
  @IsNotEmpty()
  workerType: string;

  @ApiProperty({ example: 'NO_APLICA' })
  @IsString()
  @IsNotEmpty()
  subCode: string;

  @ApiProperty({ example: 'TRANSFERENCIA_CREDITO_BANCARIO' })
  @IsString()
  @IsNotEmpty()
  paymentMeans: string;

  @ApiProperty({ example: 'TERMINO_FIJO' })
  @IsString()
  @IsNotEmpty()
  contractType: string;

  @ApiProperty({ type: PayrollEmployeeAddressDto })
  @ValidateNested()
  @Type(() => PayrollEmployeeAddressDto)
  address: PayrollEmployeeAddressDto;
}
