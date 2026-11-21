import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Quotation } from './quotation.entity';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * An "abono": part of a quotation's debt paid before the rest — see
 * docs/GLOSSARY.md ("Cartera"). Local bookkeeping only: it never touches
 * the cash register (the store chose to keep it out of "recaudado", same
 * as "Completar"), never reaches Dataico and moves no stock.
 *
 * Never edited or deleted: a wrong one is voided by an admin (`voidedAt`)
 * and stays in the history. Only non-voided abonos count toward what the
 * customer has paid.
 */
@Entity('quotation_payments')
export class QuotationPayment extends BaseEntity {
  @Index('IDX_quotation_payments_quotation_id')
  @ManyToOne(() => Quotation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  // CASH / CARD / BANK_TRANSFER — the same values an invoice uses. Only
  // informative: nothing adds abonos up by payment means.
  @Column({ name: 'payment_means', type: 'varchar', length: 20 })
  paymentMeans: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;
}
