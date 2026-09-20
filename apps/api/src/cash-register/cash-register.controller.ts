import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { QueryCashRegisterDto } from './dto/query-cash-register.dto';
import { UpdateCountedCashDto } from './dto/update-counted-cash.dto';

@ApiTags('Cash register')
@ApiBearerAuth()
@Controller('cash-register')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @ApiOperation({ summary: "Abrir caja — open today's cash register" })
  @ApiResponse({ status: 201, type: CashRegisterResponseDto })
  @ApiResponse({ status: 409, description: "Today's register is already open" })
  @Post('open')
  @RequirePermission('cash_register.open')
  open(
    @Body() dto: OpenCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.open(user.id, dto.openingAmount);
  }

  @ApiOperation({
    summary:
      "Cerrar caja — close today's cash register, auto-computing the day's report",
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
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.close(user.id, dto.countedCash);
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
  reopen(): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.reopen();
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
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.updateCountedCash(id, dto.countedCash);
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
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.addMovement(dto, user.id);
  }

  @ApiOperation({
    summary:
      "Today's cash register status — polled by the invoicing pages to gate/show it",
  })
  @ApiResponse({ status: 200, type: CashRegisterStatusDto })
  @Get('today')
  @RequirePermission('cash_register.view')
  getTodayStatus(): Promise<CashRegisterStatusDto> {
    return this.cashRegisterService.getTodayStatus();
  }

  @ApiOperation({ summary: 'List past cash registers, most recent day first' })
  @ApiResponse({ status: 200, type: [CashRegisterResponseDto] })
  @Get()
  @RequirePermission('cash_register.view')
  findAll(
    @Query() query: QueryCashRegisterDto,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    return this.cashRegisterService.findAll(query);
  }
}
