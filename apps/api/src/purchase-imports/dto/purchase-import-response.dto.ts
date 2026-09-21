import { ApiProperty } from '@nestjs/swagger';
import { PurchaseImportItem } from '../entities/purchase-import-item.entity';
import {
  PurchaseImport,
  PurchaseImportSource,
} from '../entities/purchase-import.entity';
import { LineIssue, LINE_ISSUES } from '../purchase-import-validation';
import {
  PURCHASE_IMPORT_STATUSES,
  PurchaseImportStatus,
} from './query-purchase-imports.dto';

export type LineStatus = 'existing' | 'manual' | 'new';

export function derivePurchaseImportStatus(
  purchaseImport: Pick<PurchaseImport, 'confirmedAt' | 'discardedAt'>,
): PurchaseImportStatus {
  if (purchaseImport.confirmedAt) return 'confirmed';
  if (purchaseImport.discardedAt) return 'discarded';
  return 'draft';
}

export class PurchaseImportSupplierDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() nit: string;
}

export class PurchaseImportSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: PurchaseImportSupplierDto })
  supplier: PurchaseImportSupplierDto;
  @ApiProperty() invoiceNumber: string;
  @ApiProperty({ example: '2026-09-01' }) issueDate: string;
  @ApiProperty({ enum: PURCHASE_IMPORT_STATUSES })
  status: PurchaseImportStatus;
  @ApiProperty() lineCount: number;
  @ApiProperty({ enum: ['xml', 'excel'] }) source: PurchaseImportSource;
  @ApiProperty() sourceFilename: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true, type: String }) createdByName: string | null;
  @ApiProperty({ nullable: true, type: String }) confirmedAt: string | null;

  static fromEntity(
    purchaseImport: PurchaseImport,
    lineCount: number,
  ): PurchaseImportSummaryDto {
    const dto = new PurchaseImportSummaryDto();
    dto.id = purchaseImport.id;
    dto.supplier = {
      id: purchaseImport.supplier.id,
      name: purchaseImport.supplier.name,
      nit: purchaseImport.supplier.nit,
    };
    dto.invoiceNumber = purchaseImport.invoiceNumber;
    dto.issueDate = purchaseImport.issueDate;
    dto.status = derivePurchaseImportStatus(purchaseImport);
    dto.lineCount = lineCount;
    dto.source = purchaseImport.source;
    dto.sourceFilename = purchaseImport.sourceFilename;
    dto.createdAt = purchaseImport.createdAt.toISOString();
    dto.createdByName = purchaseImport.createdBy
      ? `${purchaseImport.createdBy.firstName} ${purchaseImport.createdBy.lastName}`.trim()
      : null;
    dto.confirmedAt = purchaseImport.confirmedAt?.toISOString() ?? null;
    return dto;
  }
}

export class PurchaseImportLinkedProductDto {
  @ApiProperty() id: string;
  @ApiProperty() reference: string;
  @ApiProperty() description: string;
  @ApiProperty() stock: number;
}

export class PurchaseImportNewProductDto {
  @ApiProperty({ nullable: true, type: String }) departmentId: string | null;
  @ApiProperty({ nullable: true, type: String }) groupId: string | null;
  @ApiProperty({ nullable: true, type: String }) brandId: string | null;
  @ApiProperty({ nullable: true, type: Number }) salePrice: number | null;
  @ApiProperty() taxExempt: boolean;
}

export class PurchaseImportItemDto {
  @ApiProperty() id: string;
  @ApiProperty() lineNumber: number;
  @ApiProperty({ nullable: true, type: String }) reference: string | null;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ description: 'Read-only original from the XML.' })
  xmlQuantity: number;
  @ApiProperty({ nullable: true, type: Number }) quantity: number | null;
  @ApiProperty({ enum: ['existing', 'manual', 'new'] }) status: LineStatus;
  @ApiProperty({ nullable: true, type: PurchaseImportLinkedProductDto })
  product: PurchaseImportLinkedProductDto | null;
  @ApiProperty({ type: PurchaseImportNewProductDto })
  newProduct: PurchaseImportNewProductDto;
  @ApiProperty({
    description:
      'True on a confirmed import for lines that created their product.',
  })
  createdProduct: boolean;
  @ApiProperty({ enum: LINE_ISSUES, isArray: true })
  issues: LineIssue[];

  static fromEntity(
    item: PurchaseImportItem,
    issues: LineIssue[],
  ): PurchaseImportItemDto {
    const dto = new PurchaseImportItemDto();
    dto.id = item.id;
    dto.lineNumber = item.lineNumber;
    dto.reference = item.reference;
    dto.description = item.description;
    dto.xmlQuantity = item.xmlQuantity;
    dto.quantity = item.quantity;
    dto.status =
      item.matchType === 'exact'
        ? 'existing'
        : item.matchType === 'manual'
          ? 'manual'
          : 'new';
    dto.product = item.product
      ? {
          id: item.product.id,
          reference: item.product.reference,
          description: item.product.description,
          stock: item.product.stock,
        }
      : null;
    dto.newProduct = {
      departmentId: item.newDepartmentId,
      groupId: item.newGroupId,
      brandId: item.newBrandId,
      salePrice: item.newSalePrice,
      taxExempt: item.newTaxExempt,
    };
    dto.createdProduct = item.createdProduct;
    dto.issues = issues;
    return dto;
  }
}

export class PurchaseImportDetailDto extends PurchaseImportSummaryDto {
  @ApiProperty({ nullable: true, type: String }) cufe: string | null;
  @ApiProperty() readyToConfirm: boolean;
  @ApiProperty({ type: [PurchaseImportItemDto] })
  items: PurchaseImportItemDto[];
}

export class ConfirmedRelinkDto {
  @ApiProperty() lineNumber: number;
  @ApiProperty() reference: string;
}

export class ConfirmPurchaseImportResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['confirmed'] }) status: 'confirmed';
  @ApiProperty() confirmedAt: string;
  @ApiProperty() createdProducts: number;
  @ApiProperty() restockedProducts: number;
  @ApiProperty() unitsAdded: number;
  @ApiProperty() suppliersAssigned: number;
  @ApiProperty({
    type: [ConfirmedRelinkDto],
    description:
      'Lines drafted as "new" whose reference appeared in the catalog before confirm: stock was added to the existing product and the typed price discarded.',
  })
  relinked: ConfirmedRelinkDto[];
}
