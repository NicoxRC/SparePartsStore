import { ApiProperty } from '@nestjs/swagger';

export class DayInvoiceRowDto {
  @ApiProperty({ example: 'FEE1789500028' }) number: string;
  @ApiProperty() total: number;
  @ApiProperty({
    enum: ['CASH', 'CARD', 'BANK_TRANSFER'],
    nullable: true,
    type: String,
    description:
      'null when the invoice was paid with something outside these three.',
  })
  paymentMeans: string | null;
}

export class DayPaymentTotalDto {
  @ApiProperty() count: number;
  @ApiProperty() amount: number;
}

/** Every invoice of one store day plus how it adds up — the second page of the cash-register printout. */
export class DayInvoicesReportDto {
  @ApiProperty({ example: '2026-09-21' }) registerDate: string;
  @ApiProperty({ type: [DayInvoiceRowDto] }) invoices: DayInvoiceRowDto[];
  @ApiProperty() invoiceCount: number;
  @ApiProperty({ type: DayPaymentTotalDto }) cash: DayPaymentTotalDto;
  @ApiProperty({ type: DayPaymentTotalDto }) card: DayPaymentTotalDto;
  @ApiProperty({ type: DayPaymentTotalDto }) transfer: DayPaymentTotalDto;
  @ApiProperty({ description: 'Pre-tax value of the lines that carry IVA.' })
  taxable: number;
  @ApiProperty({ description: 'IVA charged.' }) tax: number;
  @ApiProperty({ description: 'Value of the exempt lines (no IVA).' })
  exempt: number;
  @ApiProperty({
    description:
      'Sum of the invoices\' totals — the same figure as the closing report\'s "recaudado".',
  })
  total: number;
}
