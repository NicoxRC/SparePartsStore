import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * A local record of a "nota débito" sent to Dataico — an additional
 * charge against an already-sent `Invoice` (e.g. a product the original
 * sale missed), referencing it by Dataico's own `dataico_uuid`. See
 * docs/phases/PHASE_10_INVOICING_STANDARD.md ("Still not confirmed") for
 * why this was deferred until now, and DebitNotesService for the
 * confirmed request shape.
 *
 * Unlike `customers`/`invoices`, this table is brand new with no legacy
 * rows to reconcile, so it FKs straight to `invoices.id` — the debit
 * note's own `customer` block is read from that invoice's stored
 * `request_payload` rather than re-collected, so no `customer_*` columns
 * are duplicated here either.
 *
 * No `updated_at` yet — there's no resend/refresh action for notes in
 * this first pass (see docs/DATABASE.md), so nothing updates a row after
 * insert. Add it via a follow-up migration if that changes, same as
 * `AddUpdatedAtToInvoices` did for `invoices`.
 */
@Entity('debit_notes')
export class DebitNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 20 })
  prefix: string;

  @Column({
    name: 'dataico_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  dataicoNumber: string | null;

  @ManyToOne(() => Invoice, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'varchar', length: 30 })
  reason: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'dian_status', type: 'varchar', length: 50, nullable: true })
  dianStatus: string | null;

  @Column({
    name: 'customer_status',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  customerStatus: string | null;

  @Column({ name: 'email_status', type: 'varchar', length: 50, nullable: true })
  emailStatus: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cufe: string | null;

  @Column({
    name: 'dataico_uuid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  dataicoUuid: string | null;

  @Column({ name: 'xml_url', type: 'varchar', length: 500, nullable: true })
  xmlUrl: string | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string | null;

  @Column({ name: 'dian_messages', type: 'jsonb', nullable: true })
  dianMessages: string[] | null;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload: unknown;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: unknown;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
