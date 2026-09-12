import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';

// Same pattern as Product.cost/salePrice — pg returns `numeric` as a
// string, this coerces it back to a number on read.
const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * A local record of an invoice actually sent to Dataico — see
 * docs/DATABASE.md and docs/phases/PHASE_10_INVOICING_STANDARD.md.
 * Unlike `inventory_movements`/`dian_resolutions`, this table is NOT
 * append-only: a resend or a status refresh legitimately updates the same
 * row's status/CUFE/urls in place — a resend/refresh is a correction to
 * the SAME legal document, not a new one, so a second row would be
 * misleading. `updatedAt` was added specifically for this (see the
 * `AddUpdatedAtToInvoices` migration).
 *
 * `request_payload`/`response_payload` store the full Dataico bodies as
 * JSONB rather than normalizing every nested field (items, taxes,
 * customer) into columns — Dataico's payload is rich and still evolving
 * per-module as later phases confirm more of it; promoting only the
 * fields this app actually queries on (status, CUFE, customer identity)
 * to real columns avoids speculative schema design for the rest.
 * `response_payload` deliberately excludes Dataico's `xml` field (the
 * full base64 UBL document) — it's redundant with `xml_url` and would
 * bloat every row for no benefit.
 */
@Entity('invoices')
export class Invoice {
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

  @Column({ name: 'resolution_number', type: 'varchar', length: 50 })
  resolutionNumber: string;

  @Column({ name: 'customer_identification_type', type: 'varchar', length: 20 })
  customerIdentificationType: string;

  @Column({ name: 'customer_identification', type: 'varchar', length: 50 })
  customerIdentification: string;

  @Column({
    name: 'customer_company_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerCompanyName: string | null;

  @Column({
    name: 'customer_first_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerFirstName: string | null;

  @Column({
    name: 'customer_family_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerFamilyName: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate: string | null;

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
