import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PayrollEmployeeAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  line: string;

  @ApiProperty({ example: '001', description: 'DANE city code.' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '11', description: 'DANE department code.' })
  @IsString()
  @IsNotEmpty()
  department: string;
}
