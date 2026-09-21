import { ApiProperty } from '@nestjs/swagger';

export class InvoiceTicketCustomerDto {
  @ApiProperty() name: string;
  @ApiProperty() identificationType: string;
  @ApiProperty() identification: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true, type: String }) address: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'City and department as NAMES, taken from what Dataico echoed back.',
  })
  city: string | null;
}

export class InvoiceTicketItemDto {
  @ApiProperty() description: string;
  @ApiProperty() quantity: number;
  @ApiProperty({ description: 'Unit of measure code printed in U/M.' })
  unit: string;
  @ApiProperty({ description: 'Pre-tax value of the line (price × quantity).' })
  value: number;
  @ApiProperty({ description: 'IVA rate charged on the line (0 = exempt).' })
  taxRate: number;
}

export class InvoiceTicketTaxDto {
  @ApiProperty() rate: number;
  @ApiProperty() amount: number;
}

export class InvoiceTicketAuthorizationDto {
  @ApiProperty() resolutionNumber: string;
  @ApiProperty() prefix: string;
  @ApiProperty({ nullable: true, type: String }) startDate: string | null;
  @ApiProperty({ nullable: true, type: String }) endDate: string | null;
  @ApiProperty({ nullable: true, type: Number }) rangeStart: number | null;
  @ApiProperty({ nullable: true, type: Number }) rangeEnd: number | null;
}

/** Everything the counter receipt ("tirilla") of an invoice prints. */
export class InvoiceTicketDto {
  @ApiProperty({ example: 'FEE1789500028' }) number: string;
  @ApiProperty() operationType: string;
  @ApiProperty({ description: 'When the invoice was generated (ISO).' })
  issuedAt: string;
  @ApiProperty({ nullable: true, type: String, example: '2026-09-21' })
  dueDate: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description:
      "Dataico's validation date, empty until the DIAN validated it.",
  })
  validatedAt: string | null;
  @ApiProperty({ enum: ['Contado', 'Crédito'] }) paymentForm: string;
  @ApiProperty() paymentMeans: string;
  @ApiProperty() currency: string;
  @ApiProperty({ type: InvoiceTicketCustomerDto })
  customer: InvoiceTicketCustomerDto;
  @ApiProperty({ type: [InvoiceTicketItemDto] })
  items: InvoiceTicketItemDto[];
  @ApiProperty() subtotal: number;
  @ApiProperty({ type: [InvoiceTicketTaxDto] }) taxes: InvoiceTicketTaxDto[];
  @ApiProperty() total: number;
  @ApiProperty({ nullable: true, type: InvoiceTicketAuthorizationDto })
  authorization: InvoiceTicketAuthorizationDto | null;
  @ApiProperty({ nullable: true, type: String }) qrCode: string | null;
  @ApiProperty({ nullable: true, type: String }) cufe: string | null;
  @ApiProperty({ nullable: true, type: String }) dianStatus: string | null;
  @ApiProperty({
    description:
      'False while the DIAN has not accepted the invoice — the receipt must then say so.',
  })
  isDianValidated: boolean;
}
