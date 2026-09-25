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
import { InvoiceResponseDto } from '../invoicing/invoices/dto/invoice-response.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { InvoiceQuotationDto } from './dto/invoice-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { QuotationResponseDto } from './dto/quotation-response.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('Quotations (cotizaciones)')
@ApiBearerAuth()
@Controller('quotations')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @ApiOperation({
    summary: 'Create a quotation — decrements stock like a real sale',
  })
  @ApiResponse({ status: 201, type: QuotationResponseDto })
  @Post()
  @RequirePermission('quotations.create')
  create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuotationResponseDto> {
    return this.quotationsService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List quotations, most recent first' })
  @ApiResponse({ status: 200, type: [QuotationResponseDto] })
  @Get()
  @RequirePermission('quotations.view')
  findAll(
    @Query() query: QueryQuotationsDto,
  ): Promise<PaginatedResponseDto<QuotationResponseDto>> {
    return this.quotationsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one quotation with its items' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @Get(':id')
  @RequirePermission('quotations.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationsService.findOne(id);
  }

  @ApiOperation({ summary: "Replace a quotation's items — only while open" })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @Patch(':id/items')
  @RequirePermission('quotations.update')
  updateItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuotationResponseDto> {
    return this.quotationsService.updateItems(id, dto, user.id);
  }

  @ApiOperation({ summary: 'Convert a quotation into a real invoice' })
  @ApiResponse({
    status: 201,
    type: [InvoiceResponseDto],
    description:
      'Every invoice produced — several only for a "Consumidor final" sale over $235.000',
  })
  @Post(':id/invoice')
  @RequirePermission('quotations.invoice')
  invoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvoiceQuotationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceResponseDto[]> {
    return this.quotationsService.invoice(id, dto, user.id);
  }

  @ApiOperation({ summary: 'Cancel a quotation — returns its stock' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @Post(':id/cancel')
  @RequirePermission('quotations.cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuotationResponseDto> {
    return this.quotationsService.cancel(id, user.id);
  }
}
