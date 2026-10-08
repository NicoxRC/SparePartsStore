import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  allowedCashRegisterNumbers,
  CASH_REGISTER_HEADER,
} from '../common/constants/cash-register.constant';
import { CurrentCashRegister } from '../common/decorators/cash-register-number.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { ClosePastCashRegisterDto } from './dto/close-past-cash-register.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { DayInvoicesReportDto } from './dto/day-invoices-report.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { QueryCashRegisterDto } from './dto/query-cash-register.dto';
import { UpdateCountedCashDto } from './dto/update-counted-cash.dto';
import { UpdateOpeningAmountDto } from './dto/update-opening-amount.dto';

// The store has several tills (see common/constants/cash-register.constant.ts).
// The "today" routes act on the one named by the X-Cash-Register header; the
// by-id and list routes are limited to the caller's tills.
@ApiTags('Cash register')
@ApiBearerAuth()
@ApiHeader({
  name: CASH_REGISTER_HEADER,
  required: false,
  description:
    'Till the caller is working at (1, 2). Optional only for someone with a single till.',
})
@Controller('cash-register')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @ApiOperation({ summary: "Abrir caja — open that till's register for today" })
  @ApiResponse({ status: 201, type: CashRegisterResponseDto })
  @ApiResponse({ status: 409, description: "Today's register is already open" })
  @Post('open')
  @RequirePermission('cash_register.open')
  open(
    @Body() dto: OpenCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentCashRegister() registerNumber: number,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.open(
      user.id,
      registerNumber,
      dto.openingAmount,
    );
  }

  @ApiOperation({
    summary:
      "Cerrar caja — close that till's register for today, auto-computing its report",
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'No register open today' })
  @ApiResponse({
    status: 409,
    description: "Today's register is already closed",
  })
  @Post('close')
  @RequirePermission('cash_register.close')
  close(
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentCashRegister() registerNumber: number,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.close(
      user.id,
      registerNumber,
      dto.countedCash,
    );
  }

  @ApiOperation({
    summary:
      'Cerrar una caja de un día anterior que nunca se cerró (el efectivo contado es opcional)',
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 400, description: "That is today's register" })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @ApiResponse({ status: 409, description: 'Already closed' })
  @Post(':id/close')
  @RequirePermission('cash_register.close')
  closePast(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClosePastCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.closePast(
      id,
      user.id,
      allowedCashRegisterNumbers(user),
      dto.countedCash,
    );
  }

  @ApiOperation({
    summary:
      "Reabrir caja — undo an accidental close of today's register, keeping all its data",
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'No register for today' })
  @ApiResponse({ status: 409, description: "Today's register is already open" })
  @Post('reopen')
  @RequirePermission('cash_register.reopen')
  reopen(
    @CurrentCashRegister() registerNumber: number,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.reopen(registerNumber);
  }

  @ApiOperation({
    summary: 'Corregir el efectivo contado de una caja ya cerrada.',
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 400, description: 'La caja no está cerrada' })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @Patch(':id/counted-cash')
  @RequirePermission('cash_register.counted_cash.correct')
  updateCountedCash(
    @Param('id') id: string,
    @Body() dto: UpdateCountedCashDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.updateCountedCash(
      id,
      dto.countedCash,
      allowedCashRegisterNumbers(user),
    );
  }

  // Admin-only on purpose, not a grantable permission: the base is what the
  // whole day's expected cash is measured against.
  @ApiOperation({
    summary:
      'Corregir la base (efectivo al abrir) de una caja, abierta o ya cerrada. Solo admin.',
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @Patch(':id/opening-amount')
  @Roles(UserRole.ADMIN)
  updateOpeningAmount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpeningAmountDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.updateOpeningAmount(
      id,
      dto.openingAmount,
      allowedCashRegisterNumbers(user),
    );
  }

  @ApiOperation({
    summary:
      'Registrar una entrada o salida de efectivo que no es una venta (requiere razón).',
  })
  @ApiResponse({ status: 201, type: CashRegisterResponseDto })
  @ApiResponse({ status: 400, description: 'No hay una caja abierta para hoy' })
  @Post('movements')
  @RequirePermission('cash_register.movements.create')
  addMovement(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentCashRegister() registerNumber: number,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.addMovement(dto, user.id, registerNumber);
  }

  @ApiOperation({
    summary:
      "That till's status today — polled by the invoicing pages to gate/show it",
  })
  @ApiResponse({ status: 200, type: CashRegisterStatusDto })
  @Get('today')
  @RequirePermission('cash_register.view')
  getTodayStatus(
    @CurrentCashRegister() registerNumber: number,
  ): Promise<CashRegisterStatusDto> {
    return this.cashRegisterService.getTodayStatus(registerNumber);
  }

  @ApiOperation({
    summary:
      'Every invoice of a register plus the totals — the second page of the printed cash-register slip',
  })
  @ApiResponse({ status: 200, type: DayInvoicesReportDto })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @Get(':id/invoices')
  @RequirePermission('cash_register.view')
  getDayInvoicesReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DayInvoicesReportDto> {
    return this.cashRegisterService.getDayInvoicesReport(
      id,
      allowedCashRegisterNumbers(user),
    );
  }

  @ApiOperation({
    summary: "List the caller's tills' registers, most recent day first",
  })
  @ApiResponse({ status: 200, type: [CashRegisterResponseDto] })
  @Get()
  @RequirePermission('cash_register.view')
  findAll(
    @Query() query: QueryCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    return this.cashRegisterService.findAll(
      query,
      allowedCashRegisterNumbers(user),
    );
  }
}
