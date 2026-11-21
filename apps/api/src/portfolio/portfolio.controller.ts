import {
  Body,
  Controller,
  Get,
  HttpCode,
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
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateQuotationPaymentDto } from './dto/create-quotation-payment.dto';
import { PortfolioDateRangeDto } from './dto/portfolio-date-range.dto';
import {
  CreateQuotationPaymentResultDto,
  CustomerPortfolioResponseDto,
  PortfolioSummaryResponseDto,
  VoidQuotationPaymentResultDto,
} from './dto/portfolio-response.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio (cartera)')
@ApiBearerAuth()
@Controller('portfolio')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @ApiOperation({
    summary:
      'Cartera general — what each customer owes on open quotations, net of abonos',
  })
  @ApiResponse({ status: 200, type: PortfolioSummaryResponseDto })
  @ApiResponse({ status: 400, description: '"from" is after "to"' })
  @Get()
  @RequirePermission('portfolio.view')
  getSummary(
    @Query() query: QueryPortfolioDto,
  ): Promise<PortfolioSummaryResponseDto> {
    return this.portfolioService.getSummary(query);
  }

  @ApiOperation({
    summary:
      "Cartera individual — one customer's open quotations, each with its abonos",
  })
  @ApiResponse({ status: 200, type: CustomerPortfolioResponseDto })
  @ApiResponse({ status: 404, description: 'No quotation was ever made to it' })
  @Get('customers/:identification')
  @RequirePermission('portfolio.view')
  getCustomer(
    @Param('identification') identification: string,
    @Query() range: PortfolioDateRangeDto,
  ): Promise<CustomerPortfolioResponseDto> {
    return this.portfolioService.getCustomer(identification.trim(), range);
  }

  @ApiOperation({
    summary:
      'Register an abono on an open quotation — paying the whole balance completes it',
  })
  @ApiResponse({ status: 201, type: CreateQuotationPaymentResultDto })
  @ApiResponse({
    status: 400,
    description: 'Quotation not open, or the abono exceeds the balance',
  })
  @Post('quotations/:id/payments')
  @RequirePermission('portfolio.payments.create')
  createPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuotationPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateQuotationPaymentResultDto> {
    return this.portfolioService.createPayment(id, dto, user.id);
  }

  @ApiOperation({
    summary:
      'Void a wrong abono (admin only) — kept in the history; reopens a quotation its abonos had completed',
  })
  @ApiResponse({ status: 200, type: VoidQuotationPaymentResultDto })
  @ApiResponse({
    status: 400,
    description:
      'Already voided, or its quotation was invoiced, cancelled, merged or completed by hand',
  })
  @Post('payments/:id/void')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  voidPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VoidQuotationPaymentResultDto> {
    return this.portfolioService.voidPayment(id, user.id);
  }
}
