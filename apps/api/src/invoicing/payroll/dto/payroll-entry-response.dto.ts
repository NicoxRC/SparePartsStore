import { ApiProperty } from '@nestjs/swagger';
import { PayrollEntry } from '../entities/payroll-entry.entity';

export class PayrollEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: number;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  employeeIdentification: string;

  @ApiProperty()
  employeeName: string;

  @ApiProperty()
  salary: number;

  @ApiProperty()
  initialSettlementDate: string;

  @ApiProperty()
  finalSettlementDate: string;

  @ApiProperty({ nullable: true })
  dianStatus: string | null;

  @ApiProperty({ nullable: true })
  cufe: string | null;

  @ApiProperty({ nullable: true })
  pdfUrl: string | null;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entry: PayrollEntry): PayrollEntryResponseDto {
    const dto = new PayrollEntryResponseDto();
    dto.id = entry.id;
    dto.number = entry.number;
    dto.prefix = entry.prefix;
    dto.employeeIdentification = entry.employeeIdentification;
    dto.employeeName = entry.employeeName;
    dto.salary = entry.salary;
    dto.initialSettlementDate = entry.initialSettlementDate;
    dto.finalSettlementDate = entry.finalSettlementDate;
    dto.dianStatus = entry.dianStatus;
    dto.cufe = entry.cufe;
    dto.pdfUrl = entry.pdfUrl;
    dto.createdAt = entry.createdAt.toISOString();
    return dto;
  }
}
