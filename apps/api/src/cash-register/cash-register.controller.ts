import { Controller, Get, Post, Query } from '@nestjs/common';
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
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { QueryCashRegisterDto } from './dto/query-cash-register.dto';

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
  open(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.open(user.id);
  }

  @ApiOperation({
    summary:
      "Cerrar caja — close today's cash register, auto-computing the day's total",
  })
  @ApiResponse({ status: 200, type: CashRegisterResponseDto })
  @ApiResponse({ status: 404, description: 'No register open today' })
  @ApiResponse({
    status: 409,
    description: "Today's register is already closed",
  })
  @Post('close')
  close(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.close(user.id);
  }

  @ApiOperation({
    summary:
      "Today's cash register status — polled by the invoicing pages to gate/show it",
  })
  @ApiResponse({ status: 200, type: CashRegisterStatusDto })
  @Get('today')
  getTodayStatus(): Promise<CashRegisterStatusDto> {
    return this.cashRegisterService.getTodayStatus();
  }

  @ApiOperation({ summary: 'List past cash registers, most recent day first' })
  @ApiResponse({ status: 200, type: [CashRegisterResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryCashRegisterDto,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    return this.cashRegisterService.findAll(query);
  }
}
