import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { QuotationNote } from '../entities/quotation-note.entity';
import { QuotationPayment } from '../entities/quotation-payment.entity';

function nameOf(user: User | null | undefined): string | null {
  return user ? `${user.firstName} ${user.lastName}`.trim() : null;
}

/** An abono as Cotizaciones and the cartera show it. */
export class QuotationPaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty({
    enum: ['CASH', 'CARD', 'BANK_TRANSFER'],
    description:
      'New abonos are only CASH or BANK_TRANSFER; CARD can still appear on older ones.',
  })
  paymentMeans: string;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true, type: String }) createdByName: string | null;
  @ApiProperty({ nullable: true, type: String }) voidedAt: string | null;
  @ApiProperty({ nullable: true, type: String }) voidedByName: string | null;

  /** Needs `createdBy` and `voidedBy` loaded. */
  static fromEntity(payment: QuotationPayment): QuotationPaymentResponseDto {
    return {
      id: payment.id,
      amount: payment.amount,
      paymentMeans: payment.paymentMeans,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
      createdByName: nameOf(payment.createdBy),
      voidedAt: payment.voidedAt?.toISOString() ?? null,
      voidedByName: nameOf(payment.voidedBy),
    };
  }
}

/** One entry of a quotation's notes history. */
export class QuotationNoteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() text: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true, type: String }) createdByName: string | null;

  /** Needs `createdBy` loaded. */
  static fromEntity(note: QuotationNote): QuotationNoteResponseDto {
    return {
      id: note.id,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
      createdByName: nameOf(note.createdBy),
    };
  }
}
