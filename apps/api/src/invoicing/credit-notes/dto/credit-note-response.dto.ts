import { ApiProperty } from '@nestjs/swagger';
import { CreditNote } from '../entities/credit-note.entity';

export class CreditNoteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiProperty() prefix: string;
  @ApiProperty({ nullable: true }) dataicoNumber: string | null;
  @ApiProperty() invoiceId: string;
  @ApiProperty({
    description: 'The corrected invoice\'s own business number, e.g. "FE123".',
  })
  invoiceLabel: string;
  @ApiProperty() reason: string;
  @ApiProperty() issueDate: string;
  @ApiProperty({ nullable: true }) dianStatus: string | null;
  @ApiProperty({ nullable: true }) cufe: string | null;
  @ApiProperty({ nullable: true }) xmlUrl: string | null;
  @ApiProperty({ nullable: true }) pdfUrl: string | null;
  @ApiProperty({ nullable: true, type: [String] }) dianMessages:
    | string[]
    | null;
  @ApiProperty() totalAmount: number;
  @ApiProperty() createdAt: string;

  static fromEntity(note: CreditNote): CreditNoteResponseDto {
    const dto = new CreditNoteResponseDto();
    dto.id = note.id;
    dto.number = note.number;
    dto.prefix = note.prefix;
    dto.dataicoNumber = note.dataicoNumber;
    dto.invoiceId = note.invoice.id;
    dto.invoiceLabel = `${note.invoice.prefix}${note.invoice.number}`;
    dto.reason = note.reason;
    dto.issueDate = note.issueDate;
    dto.dianStatus = note.dianStatus;
    dto.cufe = note.cufe;
    dto.xmlUrl = note.xmlUrl;
    dto.pdfUrl = note.pdfUrl;
    dto.dianMessages = note.dianMessages;
    dto.totalAmount = note.totalAmount;
    dto.createdAt = note.createdAt.toISOString();
    return dto;
  }
}
