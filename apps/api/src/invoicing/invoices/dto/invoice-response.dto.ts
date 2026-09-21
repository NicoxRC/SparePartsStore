import { ApiProperty } from '@nestjs/swagger';
import { Invoice } from '../entities/invoice.entity';
import { readInvoicedItems } from '../invoiced-items.util';

export class InvoicedItemDto {
  @ApiProperty() sku: string;
  @ApiProperty() description: string;
  @ApiProperty() quantity: number;
  @ApiProperty({
    description:
      'Pre-tax, post-discount unit price exactly as invoiced — it never changes when the product price does.',
  })
  unitPrice: number;
  @ApiProperty({ description: 'IVA rate charged on the line (0 if none).' })
  taxRate: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: number;

  @ApiProperty()
  prefix: string;

  @ApiProperty({ nullable: true })
  dataicoNumber: string | null;

  @ApiProperty()
  customerIdentification: string;

  @ApiProperty({ nullable: true })
  customerCompanyName: string | null;

  @ApiProperty()
  issueDate: string;

  @ApiProperty({ nullable: true })
  dianStatus: string | null;

  @ApiProperty({ nullable: true })
  cufe: string | null;

  @ApiProperty({ nullable: true })
  xmlUrl: string | null;

  @ApiProperty({ nullable: true })
  pdfUrl: string | null;

  @ApiProperty({ nullable: true, type: [String] })
  dianMessages: string[] | null;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({
    type: [InvoicedItemDto],
    description: 'The lines as they were invoiced (from the stored request).',
  })
  items: InvoicedItemDto[];

  static fromEntity(invoice: Invoice): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = invoice.id;
    dto.number = invoice.number;
    dto.prefix = invoice.prefix;
    dto.dataicoNumber = invoice.dataicoNumber;
    dto.customerIdentification = invoice.customerIdentification;
    dto.customerCompanyName = invoice.customerCompanyName;
    dto.issueDate = invoice.issueDate;
    dto.dianStatus = invoice.dianStatus;
    dto.cufe = invoice.cufe;
    dto.xmlUrl = invoice.xmlUrl;
    dto.pdfUrl = invoice.pdfUrl;
    dto.dianMessages = invoice.dianMessages;
    dto.totalAmount = invoice.totalAmount;
    dto.createdAt = invoice.createdAt.toISOString();
    dto.items = readInvoicedItems(invoice.requestPayload);
    return dto;
  }
}
