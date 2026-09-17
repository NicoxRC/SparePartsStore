import { ApiProperty } from '@nestjs/swagger';
import { InvoiceResponseDto } from '../../invoicing/invoices/dto/invoice-response.dto';
import { QuotationResponseDto } from '../../quotations/dto/quotation-response.dto';

export class CustomerHistoryResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  invoices: InvoiceResponseDto[];

  @ApiProperty({ type: [QuotationResponseDto] })
  quotations: QuotationResponseDto[];
}
