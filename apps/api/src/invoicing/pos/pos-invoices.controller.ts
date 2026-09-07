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
import { CreatePosInvoiceDto } from './dto/create-pos-invoice.dto';
import { PosInvoiceResponseDto } from './dto/pos-invoice-response.dto';
import { QueryPosInvoicesDto } from './dto/query-pos-invoices.dto';
import { PosInvoicesService } from './pos-invoices.service';

@ApiTags('Invoicing — POS Electrónico')
@ApiBearerAuth()
@Controller('invoicing/pos-invoices')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PosInvoicesController {
  constructor(private readonly posInvoicesService: PosInvoicesService) {}

  @ApiOperation({
    summary: 'Send a POS Electrónico document (counter sale)',
  })
  @ApiResponse({ status: 201, type: PosInvoiceResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or no active POS resolution',
  })
  @ApiResponse({
    status: 502,
    description: 'Dataico/DIAN rejected the document',
  })
  @Post()
  create(
    @Body() dto: CreatePosInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PosInvoiceResponseDto> {
    return this.posInvoicesService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List sent POS documents, most recent first' })
  @ApiResponse({ status: 200, type: [PosInvoiceResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryPosInvoicesDto,
  ): Promise<PaginatedResponseDto<PosInvoiceResponseDto>> {
    return this.posInvoicesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one POS document by its local id' })
  @ApiResponse({ status: 200, type: PosInvoiceResponseDto })
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PosInvoiceResponseDto> {
    const invoice = await this.posInvoicesService.findOne(id);
    return PosInvoiceResponseDto.fromEntity(invoice);
  }

  @ApiOperation({
    summary:
      "Consulta factura — refresh this POS document's status from Dataico",
  })
  @ApiResponse({ status: 200, type: PosInvoiceResponseDto })
  @Post(':id/refresh')
  refreshStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PosInvoiceResponseDto> {
    return this.posInvoicesService.refreshStatus(id);
  }
}
