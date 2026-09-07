import { ApiProperty } from '@nestjs/swagger';
import { Invoice } from '../entities/invoice.entity';

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
    return dto;
  }
}
