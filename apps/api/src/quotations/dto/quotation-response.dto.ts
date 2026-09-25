import { ApiProperty } from '@nestjs/swagger';
import { QuotationItem } from '../entities/quotation-item.entity';
import {
  Quotation,
  QUOTATION_BORROWER_TYPES,
  type QuotationBorrowerType,
} from '../entities/quotation.entity';

export class QuotationItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true, type: String })
  productId: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'null for a one-off line (not a catalog product).',
  })
  productReference: string | null;
  @ApiProperty() productDescription: string;
  @ApiProperty({ nullable: true, type: String })
  productBrand: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() taxRate: number;
  @ApiProperty({ nullable: true }) discount: number | null;
  @ApiProperty({ description: 'Locked price — see entity docstring.' })
  unitPrice: number;

  static fromEntity(item: QuotationItem): QuotationItemResponseDto {
    const dto = new QuotationItemResponseDto();
    dto.id = item.id;
    dto.productId = item.product?.id ?? null;
    dto.productReference = item.product?.reference ?? null;
    dto.productDescription =
      item.product?.description ?? item.description ?? '';
    dto.productBrand = item.product?.brand?.name ?? null;
    dto.quantity = item.quantity;
    dto.taxRate = Number(item.taxRate);
    dto.discount = item.discount;
    dto.unitPrice = item.unitPrice;
    return dto;
  }
}

export class QuotationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiProperty({ enum: ['open', 'invoiced', 'cancelled'] })
  status: 'open' | 'invoiced' | 'cancelled';
  @ApiProperty({ enum: QUOTATION_BORROWER_TYPES })
  borrowerType: QuotationBorrowerType;
  @ApiProperty({ nullable: true }) customerIdentificationType: string | null;
  @ApiProperty({ nullable: true }) customerIdentification: string | null;
  @ApiProperty({ nullable: true }) customerIdentificationDv: string | null;
  @ApiProperty({ nullable: true }) customerPartyType: string | null;
  @ApiProperty({ nullable: true }) customerTaxLevelCode: string | null;
  @ApiProperty({ nullable: true }) customerRegimen: string | null;
  @ApiProperty({ nullable: true }) customerCompanyName: string | null;
  @ApiProperty({ nullable: true }) customerFirstName: string | null;
  @ApiProperty({ nullable: true }) customerFamilyName: string | null;
  @ApiProperty({ nullable: true }) customerCountryCode: string | null;
  @ApiProperty({ nullable: true }) customerDepartment: string | null;
  @ApiProperty({ nullable: true }) customerCity: string | null;
  @ApiProperty({ nullable: true }) customerAddressLine: string | null;
  @ApiProperty({ nullable: true }) customerEmail: string | null;
  @ApiProperty({ nullable: true }) customerPhone: string | null;
  @ApiProperty({ nullable: true }) notes: string | null;
  @ApiProperty() totalAmount: number;
  @ApiProperty({ nullable: true }) invoiceId: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Who made the quotation (the "vendedor" on the printout).',
  })
  createdByName: string | null;
  @ApiProperty({ type: [QuotationItemResponseDto], required: false })
  items?: QuotationItemResponseDto[];

  static fromEntity(
    quotation: Quotation,
    includeItems = false,
  ): QuotationResponseDto {
    const dto = new QuotationResponseDto();
    dto.id = quotation.id;
    dto.number = quotation.number;
    dto.status = quotation.cancelledAt
      ? 'cancelled'
      : quotation.invoicedAt
        ? 'invoiced'
        : 'open';
    dto.borrowerType = quotation.borrowerType;
    dto.customerIdentificationType = quotation.customerIdentificationType;
    dto.customerIdentification = quotation.customerIdentification;
    dto.customerIdentificationDv = quotation.customerIdentificationDv;
    dto.customerPartyType = quotation.customerPartyType;
    dto.customerTaxLevelCode = quotation.customerTaxLevelCode;
    dto.customerRegimen = quotation.customerRegimen;
    dto.customerCompanyName = quotation.customerCompanyName;
    dto.customerFirstName = quotation.customerFirstName;
    dto.customerFamilyName = quotation.customerFamilyName;
    dto.customerCountryCode = quotation.customerCountryCode;
    dto.customerDepartment = quotation.customerDepartment;
    dto.customerCity = quotation.customerCity;
    dto.customerAddressLine = quotation.customerAddressLine;
    dto.customerEmail = quotation.customerEmail;
    dto.customerPhone = quotation.customerPhone;
    dto.notes = quotation.notes;
    dto.totalAmount = quotation.totalAmount;
    dto.invoiceId = quotation.invoice?.id ?? null;
    dto.createdAt = quotation.createdAt.toISOString();
    dto.createdByName = quotation.createdBy
      ? `${quotation.createdBy.firstName} ${quotation.createdBy.lastName}`.trim()
      : null;
    if (includeItems) {
      dto.items = quotation.items.map((item) =>
        QuotationItemResponseDto.fromEntity(item),
      );
    }
    return dto;
  }
}
