import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
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
import { TEMPLATE_FILENAME, XLSX_MIME } from './excel/purchase-sheet.layout';
import { ApplyClassificationDto } from './dto/apply-classification.dto';
import {
  ConfirmPurchaseImportResponseDto,
  PurchaseImportDetailDto,
  PurchaseImportSummaryDto,
} from './dto/purchase-import-response.dto';
import { QueryPurchaseImportsDto } from './dto/query-purchase-imports.dto';
import { UpdatePurchaseImportItemDto } from './dto/update-purchase-import-item.dto';
import { PurchaseImportsService } from './purchase-imports.service';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const XML_MIME_TYPES = ['text/xml', 'application/xml'];

@ApiTags('Purchase imports (compras por XML)')
@ApiBearerAuth()
@Controller('purchase-imports')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class PurchaseImportsController {
  constructor(
    private readonly purchaseImportsService: PurchaseImportsService,
  ) {}

  @ApiOperation({
    summary:
      "Upload a supplier's electronic-invoice XML — creates a DRAFT, touches no stock",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: PurchaseImportDetailDto })
  @ApiResponse({
    status: 409,
    description:
      'PURCHASE_IMPORT_DUPLICATE — carries existingImportId and existingStatus',
  })
  @ApiResponse({ status: 413, description: 'File larger than 5 MB' })
  @ApiResponse({
    status: 422,
    description: 'Unreadable/unsupported XML — see the `code` field',
  })
  @Post()
  @RequirePermission('purchase_imports.create')
  // Memory storage: parsed once, never written to disk.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseImportDetailDto> {
    if (!file) {
      throw new BadRequestException('Attach the XML file in the "file" field');
    }
    // Mobile browsers often send .xml as application/octet-stream, so the name
    // OR the mime is accepted; the real gate is "did it parse as an Invoice".
    const looksLikeXml =
      file.originalname.toLowerCase().endsWith('.xml') ||
      XML_MIME_TYPES.includes(file.mimetype);
    if (!looksLikeXml) {
      throw new BadRequestException('The file must be an .xml');
    }
    return this.purchaseImportsService.upload(file, user.id);
  }

  @ApiOperation({
    summary: 'Download the Excel template for loading products without an XML',
  })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({ status: 200, description: 'The .xlsx template' })
  // Declared before ':id' so "template" isn't parsed as a UUID.
  @Get('template')
  @RequirePermission('purchase_imports.create')
  async downloadTemplate(): Promise<StreamableFile> {
    return new StreamableFile(
      await this.purchaseImportsService.buildTemplate(),
      {
        type: XLSX_MIME,
        disposition: `attachment; filename="${TEMPLATE_FILENAME}"`,
      },
    );
  }

  @ApiOperation({
    summary:
      'Upload the filled-in Excel template — creates a DRAFT (same review flow as an XML), touches no stock',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: PurchaseImportDetailDto })
  @ApiResponse({
    status: 409,
    description:
      'PURCHASE_IMPORT_DUPLICATE — only when the template carries an invoice number',
  })
  @ApiResponse({ status: 413, description: 'File larger than 5 MB' })
  @ApiResponse({
    status: 422,
    description: 'Not the template / bad data — see the `code` field',
  })
  @Post('excel')
  @RequirePermission('purchase_imports.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  uploadExcel(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseImportDetailDto> {
    if (!file) {
      throw new BadRequestException(
        'Attach the Excel file in the "file" field',
      );
    }
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException(
        'The file must be an .xlsx (the template you downloaded)',
      );
    }
    return this.purchaseImportsService.uploadExcel(file, user.id);
  }

  @ApiOperation({
    summary:
      'List imports (draft/confirmed/discarded); drafts come ordered by supplier',
  })
  @ApiResponse({ status: 200, type: [PurchaseImportSummaryDto] })
  @Get()
  @RequirePermission('purchase_imports.view')
  findAll(
    @Query() query: QueryPurchaseImportsDto,
  ): Promise<PaginatedResponseDto<PurchaseImportSummaryDto>> {
    return this.purchaseImportsService.findAll(query);
  }

  @ApiOperation({ summary: 'Import detail with per-line issues' })
  @ApiResponse({ status: 200, type: PurchaseImportDetailDto })
  @ApiResponse({ status: 404, description: 'Import not found' })
  @Get(':id')
  @RequirePermission('purchase_imports.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseImportDetailDto> {
    return this.purchaseImportsService.findOne(id);
  }

  @ApiOperation({ summary: 'Edit one draft line' })
  @ApiResponse({ status: 200, type: PurchaseImportDetailDto })
  @ApiResponse({ status: 409, description: 'PURCHASE_IMPORT_NOT_DRAFT' })
  @Patch(':id/items/:itemId')
  @RequirePermission('purchase_imports.create')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdatePurchaseImportItemDto,
  ): Promise<PurchaseImportDetailDto> {
    return this.purchaseImportsService.updateItem(id, itemId, dto);
  }

  @ApiOperation({ summary: 'Remove a draft line (freight, labor, non-stock)' })
  @ApiResponse({ status: 200, type: PurchaseImportDetailDto })
  @ApiResponse({ status: 409, description: 'PURCHASE_IMPORT_NOT_DRAFT' })
  @Delete(':id/items/:itemId')
  @RequirePermission('purchase_imports.create')
  deleteItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<PurchaseImportDetailDto> {
    return this.purchaseImportsService.deleteItem(id, itemId);
  }

  @ApiOperation({
    summary:
      'Set department/group/brand on every NEW line that has that field empty',
  })
  @ApiResponse({ status: 200, type: PurchaseImportDetailDto })
  @ApiResponse({ status: 409, description: 'PURCHASE_IMPORT_NOT_DRAFT' })
  @Post(':id/apply-classification')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('purchase_imports.create')
  applyClassification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyClassificationDto,
  ): Promise<PurchaseImportDetailDto> {
    return this.purchaseImportsService.applyClassification(id, dto);
  }

  @ApiOperation({
    summary:
      'Confirm the whole draft: creates missing products and adds stock, atomically',
  })
  @ApiResponse({ status: 200, type: ConfirmPurchaseImportResponseDto })
  @ApiResponse({
    status: 400,
    description: 'PURCHASE_IMPORT_INVALID — carries problems[]',
  })
  @ApiResponse({
    status: 409,
    description: 'PURCHASE_IMPORT_NOT_DRAFT or PRODUCT_REFERENCE_TAKEN',
  })
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('purchase_imports.confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConfirmPurchaseImportResponseDto> {
    return this.purchaseImportsService.confirm(id, user.id);
  }

  @ApiOperation({
    summary: 'Discard a draft (frees the invoice for re-upload)',
  })
  @ApiResponse({ status: 200, type: PurchaseImportDetailDto })
  @ApiResponse({ status: 409, description: 'PURCHASE_IMPORT_NOT_DRAFT' })
  @Post(':id/discard')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('purchase_imports.create')
  discard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseImportDetailDto> {
    return this.purchaseImportsService.discard(id, user.id);
  }
}
