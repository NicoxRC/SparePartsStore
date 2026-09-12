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
 * A local record of a payroll period sent to Dataico's Nómina Electrónica
 * — see docs/DATABASE.md and docs/phases/PHASE_15_PAYROLL.md.
 *
 * Confirmed with the human: this app is NOT the source of truth for
 * employees/payroll — every figure (salary, accruals, deductions) is
 * already calculated elsewhere (e.g. an accountant) and just forwarded
 * here. That's why `employee`/`accruals`/`deductions` are stored as
 * JSONB rather than a normalized employee/line-item schema — there is no
 * employee table to join against, and building one was explicitly out of
 * scope for this phase.
 *
 * `employee_identification`/`employee_name` are promoted to real columns
 * purely for listing/search; everything else about the employee lives in
 * `employee_payload`.
 */
@Entity('payroll_entries')
export class PayrollEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 20 })
  prefix: string;

  @Column({ name: 'employee_identification', type: 'varchar', length: 50 })
  employeeIdentification: string;

  @Column({ name: 'employee_name', type: 'varchar', length: 255 })
  employeeName: string;

  @Column({ name: 'employee_payload', type: 'jsonb' })
  employeePayload: unknown;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  salary: number;

  @Column({ type: 'varchar', length: 20 })
  periodicity: string;

  @Column({ name: 'initial_settlement_date', type: 'date' })
  initialSettlementDate: string;

  @Column({ name: 'final_settlement_date', type: 'date' })
  finalSettlementDate: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'jsonb' })
  accruals: unknown;

  @Column({ type: 'jsonb' })
  deductions: unknown;

  @Column({ type: 'jsonb', nullable: true })
  notes: string[] | null;

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
