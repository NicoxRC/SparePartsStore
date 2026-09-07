import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { PayrollEntryResponseDto } from './dto/payroll-entry-response.dto';
import { QueryPayrollEntriesDto } from './dto/query-payroll-entries.dto';
import { PayrollService } from './payroll.service';

/**
 * Admin-only, unlike invoices/POS — payroll is compensation data, not an
 * everyday counter-sale action any employee should reach.
 */
@ApiTags('Invoicing — Nómina Electrónica')
@ApiBearerAuth()
@Controller('invoicing/payroll-entries')
@Roles(UserRole.ADMIN)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @ApiOperation({ summary: 'Submit a payroll period to DIAN via Dataico' })
  @ApiResponse({ status: 201, type: PayrollEntryResponseDto })
  @ApiResponse({ status: 502, description: 'Dataico/DIAN rejected the entry' })
  @Post()
  create(
    @Body() dto: CreatePayrollEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayrollEntryResponseDto> {
    return this.payrollService.create(dto, user.id);
  }

  @ApiOperation({
    summary: 'List submitted payroll entries, most recent first',
  })
  @ApiResponse({ status: 200, type: [PayrollEntryResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryPayrollEntriesDto,
  ): Promise<PaginatedResponseDto<PayrollEntryResponseDto>> {
    return this.payrollService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one payroll entry by its local id' })
  @ApiResponse({ status: 200, type: PayrollEntryResponseDto })
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayrollEntryResponseDto> {
    const entry = await this.payrollService.findOne(id);
    return PayrollEntryResponseDto.fromEntity(entry);
  }

  @ApiOperation({ summary: "Refresh this payroll entry's status from Dataico" })
  @ApiResponse({ status: 200, type: PayrollEntryResponseDto })
  @Post(':id/refresh')
  refreshStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayrollEntryResponseDto> {
    return this.payrollService.refreshStatus(id);
  }
}
