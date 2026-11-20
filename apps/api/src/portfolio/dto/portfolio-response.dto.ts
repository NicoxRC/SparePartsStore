import { ApiProperty } from '@nestjs/swagger';

export class PortfolioTotalsDto {
  @ApiProperty({ description: 'Sum of the open quotations’ totals.' })
  totalAmount: number;

  @ApiProperty({ description: 'Paid so far through abonos (not voided).' })
  paidAmount: number;

  @ApiProperty({ description: 'Still to collect: totalAmount − paidAmount.' })
  balance: number;

  @ApiProperty({ description: 'How many open quotations.' })
  quotationCount: number;
}

export class PortfolioCustomerDto {
  @ApiProperty() identificationType: string;
  @ApiProperty() identification: string;
  @ApiProperty({ description: 'From the customer’s most recent quotation.' })
  name: string;
  @ApiProperty({ nullable: true, type: String }) phone: string | null;
}

export class PortfolioCustomerSummaryDto extends PortfolioCustomerDto {
  @ApiProperty({ type: PortfolioTotalsDto }) totals: PortfolioTotalsDto;

  @ApiProperty({
    description:
      'When the oldest open quotation was made — the payment term counts from here.',
  })
  oldestCreatedAt: string;

  @ApiProperty({
    description: 'Most recent change to any of the customer’s open quotations.',
  })
  lastChangedAt: string;
}

export class PortfolioSummaryResponseDto {
  @ApiProperty({ type: PortfolioTotalsDto }) totals: PortfolioTotalsDto;

  @ApiProperty({
    type: [PortfolioCustomerSummaryDto],
    description:
      'Every customer with an open quotation in range, biggest balance first.',
  })
  customers: PortfolioCustomerSummaryDto[];
}

export class QuotationPaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: ['CASH', 'CARD', 'BANK_TRANSFER'] })
  paymentMeans: string;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true, type: String }) createdByName: string | null;
  @ApiProperty({ nullable: true, type: String }) voidedAt: string | null;
  @ApiProperty({ nullable: true, type: String }) voidedByName: string | null;
}

export class PortfolioQuotationDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiProperty() createdAt: string;
  @ApiProperty({
    description: 'Last change to the quotation’s items (see quotations).',
  })
  lastChangedAt: string;
  @ApiProperty() totalAmount: number;
  @ApiProperty() paidAmount: number;
  @ApiProperty() balance: number;
  @ApiProperty({
    type: [QuotationPaymentResponseDto],
    description: 'Every abono, oldest first — voided ones included, marked.',
  })
  payments: QuotationPaymentResponseDto[];
}

export class CustomerPortfolioResponseDto {
  @ApiProperty({ type: PortfolioCustomerDto }) customer: PortfolioCustomerDto;
  @ApiProperty({ type: PortfolioTotalsDto }) totals: PortfolioTotalsDto;
  @ApiProperty({
    type: [PortfolioQuotationDto],
    description: 'Open quotations in range, oldest first.',
  })
  quotations: PortfolioQuotationDto[];
}

export class CreateQuotationPaymentResultDto {
  @ApiProperty() paymentId: string;
  @ApiProperty() quotationId: string;
  @ApiProperty({ description: 'What is still owed on that quotation.' })
  balance: number;
  @ApiProperty({
    description: 'True when this abono paid it off and closed it as completed.',
  })
  quotationCompleted: boolean;
}

export class VoidQuotationPaymentResultDto {
  @ApiProperty() quotationId: string;
  @ApiProperty({
    description:
      'True when the quotation had been completed by its abonos and is open again.',
  })
  quotationReopened: boolean;
}
