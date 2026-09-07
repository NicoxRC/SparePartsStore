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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { ResendInvoiceDto } from './dto/resend-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoicing — invoices')
@ApiBearerAuth()
@Controller('invoicing/invoices')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @ApiOperation({
    summary:
      'Send a standard electronic invoice (Factura electrónica estándar)',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or no active DIAN resolution',
  })
  @ApiResponse({
    status: 502,
    description: 'Dataico/DIAN rejected the invoice',
  })
  @Post()
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List sent invoices, most recent first' })
  @ApiResponse({ status: 200, type: [InvoiceResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryInvoicesDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    return this.invoicesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one invoice by its local id' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoicesService.findOne(id);
    return InvoiceResponseDto.fromEntity(invoice);
  }

  @ApiOperation({
    summary:
      'Reenviar factura — re-trigger DIAN submission and/or email on an invoice that already exists in Dataico (not a new document)',
  })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @ApiResponse({ status: 502, description: 'Dataico/DIAN rejected the resend' })
  @Post(':id/resend')
  resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.resend(id, dto);
  }

  @ApiOperation({
    summary: "Consulta Factura — refresh this invoice's status from Dataico",
  })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @Post(':id/refresh')
  refreshStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.refreshStatus(id);
  }
}
