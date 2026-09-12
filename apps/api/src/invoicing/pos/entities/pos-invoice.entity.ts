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
 * A local record of a POS Electrónico document sent to Dataico — see
 * docs/DATABASE.md and docs/phases/PHASE_12_POS.md. Confirmed against a
 * STAGING-only reference — no production URL, no confirmed response
 * shape. `dian_status`/`cufe`/etc. are populated on a best-effort basis
 * using the same field names as the confirmed standard-invoice response,
 * NOT verified for POS specifically — see the phase doc.
 */
@Entity('pos_invoices')
export class PosInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 20 })
  prefix: string;

  @Column({ name: 'resolution_number', type: 'varchar', length: 50 })
  resolutionNumber: string;

  @Column({ name: 'customer_type', type: 'varchar', length: 20 })
  customerType: string;

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

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  customerPhone: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({
    name: 'dataico_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  dataicoNumber: string | null;

  @Column({ name: 'dian_status', type: 'varchar', length: 50, nullable: true })
  dianStatus: string | null;

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
