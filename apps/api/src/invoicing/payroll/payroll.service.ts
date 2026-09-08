import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { PayrollEntryResponseDto } from './dto/payroll-entry-response.dto';
import { PayrollLineItemDto } from './dto/payroll-line-item.dto';
import { QueryPayrollEntriesDto } from './dto/query-payroll-entries.dto';
import { PayrollEntry } from './entities/payroll-entry.entity';

/**
 * NOT confirmed — no success response was ever shared for Nómina
 * Electrónica, only requests. Field names below mirror the confirmed
 * standard-invoice response as a reasonable, cheap-to-fix assumption —
 * see docs/phases/PHASE_15_PAYROLL.md.
 */
interface DataicoPayrollResponse {
  dian_status?: string;
  cufe?: string;
  uuid?: string;
  xml_url?: string;
  pdf_url?: string;
  xml?: string;
  [key: string]: unknown;
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollEntry)
    private readonly payrollRepository: Repository<PayrollEntry>,
    private readonly dataicoClient: DataicoClientService,
    private readonly dataicoConfig: DataicoConfig,
  ) {}

  async create(
    dto: CreatePayrollEntryDto,
    createdById: string,
  ): Promise<PayrollEntryResponseDto> {
    const employeeName = [
      dto.employee.firstName,
      dto.employee.otherNames,
      dto.employee.lastName,
      dto.employee.secondLastName,
    ]
      .filter(Boolean)
      .join(' ');

    const employeePayload = {
      code: dto.employee.identification,
      identification: dto.employee.identification,
      'identification-type': dto.employee.identificationType,
      'first-name': dto.employee.firstName,
      ...(dto.employee.otherNames
        ? { 'other-names': dto.employee.otherNames }
        : {}),
      'last-name': dto.employee.lastName,
      ...(dto.employee.secondLastName
        ? { 'second-last-name': dto.employee.secondLastName }
        : {}),
      'integral-salary': dto.employee.integralSalary,
      'high-risk': dto.employee.highRisk,
      'start-date': this.toDataicoDate(dto.employee.startDate),
      email: dto.employee.email,
      'worker-type': dto.employee.workerType,
      'sub-code': dto.employee.subCode,
      'payment-means': dto.employee.paymentMeans,
      'contract-type': dto.employee.contractType,
      address: {
        line: dto.employee.address.line,
        city: dto.employee.address.city,
        department: dto.employee.address.department,
      },
    };

    const requestPayload = {
      send_dian: true,
      env: 'PRODUCCION',
      prefix: dto.prefix,
      number: dto.number,
      salary: dto.salary,
      periodicity: dto.periodicity,
      'initial-settlement-date': this.toDataicoDate(dto.initialSettlementDate),
      'final-settlement-date': this.toDataicoDate(dto.finalSettlementDate),
      'issue-date': this.toDataicoDate(dto.issueDate),
      'payment-date': this.toDataicoDate(dto.paymentDate),
      notes: (dto.notes ?? []).map((text) => ({ text })),
      accruals: dto.accruals.map((item) => this.buildLineItem(item)),
      deductions: (dto.deductions ?? []).map((item) =>
        this.buildLineItem(item),
      ),
      employee: employeePayload,
    };

    const response = await this.dataicoClient.post<DataicoPayrollResponse>(
      '/payroll-entries',
      requestPayload,
      this.dataicoConfig.payrollBaseUrl,
    );

    const responsePayload: Record<string, unknown> = { ...response };
    delete responsePayload.xml;

    const entry = this.payrollRepository.create({
      prefix: dto.prefix,
      number: dto.number,
      employeeIdentification: dto.employee.identification,
      employeeName,
      employeePayload,
      salary: dto.salary,
      periodicity: dto.periodicity,
      initialSettlementDate: dto.initialSettlementDate,
      finalSettlementDate: dto.finalSettlementDate,
      issueDate: dto.issueDate,
      paymentDate: dto.paymentDate,
      accruals: dto.accruals,
      deductions: dto.deductions ?? [],
      notes: dto.notes ?? null,
      dianStatus: response.dian_status ?? null,
      cufe: response.cufe ?? null,
      dataicoUuid: response.uuid ?? null,
      xmlUrl: response.xml_url ?? null,
      pdfUrl: response.pdf_url ?? null,
      requestPayload,
      responsePayload,
      createdBy: { id: createdById } as PayrollEntry['createdBy'],
    });

    const saved = await this.payrollRepository.save(entry);
    return PayrollEntryResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryPayrollEntriesDto,
  ): Promise<PaginatedResponseDto<PayrollEntryResponseDto>> {
    const { page, limit } = query;

    const [entries, total] = await this.payrollRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entries.map((entry) => PayrollEntryResponseDto.fromEntity(entry)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<PayrollEntry> {
    const entry = await this.payrollRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }
    return entry;
  }

  /**
   * Confirmed: `GET /payroll-entries/{prefix}/{number}` — path segments,
   * not a query string like every other Dataico resource confirmed so
   * far. Response shape assumed same as create's (see the module note).
   */
  async refreshStatus(id: string): Promise<PayrollEntryResponseDto> {
    const entry = await this.findOne(id);

    const response = await this.dataicoClient.get<DataicoPayrollResponse>(
      `/payroll-entries/${encodeURIComponent(entry.prefix)}/${entry.number}`,
      this.dataicoConfig.payrollBaseUrl,
    );

    const responsePayload: Record<string, unknown> = { ...response };
    delete responsePayload.xml;

    entry.dianStatus = response.dian_status ?? entry.dianStatus;
    entry.cufe = response.cufe ?? entry.cufe;
    entry.dataicoUuid = response.uuid ?? entry.dataicoUuid;
    entry.xmlUrl = response.xml_url ?? entry.xmlUrl;
    entry.pdfUrl = response.pdf_url ?? entry.pdfUrl;
    entry.responsePayload = responsePayload;

    const saved = await this.payrollRepository.save(entry);
    return PayrollEntryResponseDto.fromEntity(saved);
  }

  private buildLineItem(item: PayrollLineItemDto): Record<string, unknown> {
    return {
      code: item.code,
      amount: item.amount,
      ...(item.days !== undefined ? { days: item.days } : {}),
      ...(item.percentage !== undefined ? { percentage: item.percentage } : {}),
      ...(item.description !== undefined
        ? { description: item.description }
        : {}),
    };
  }

  /** ISO 'YYYY-MM-DD' -> Dataico's confirmed 'DD/MM/YYYY' format. */
  private toDataicoDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
}
