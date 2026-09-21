import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { PurchaseImportItem } from './purchase-import-item.entity';

export type PurchaseImportSource = 'xml' | 'excel';

/**
 * The header of a draft built from a supplier's XML invoice. State is derived
 * from `confirmedAt`/`discardedAt` (both null = draft) — same precedent as
 * `quotations.invoicedAt`/`cancelledAt`. Deliberately does not extend
 * BaseEntity: "discarded" is the removal state, so a `deletedAt` would be a
 * second way to say the same thing.
 */
@Entity('purchase_imports')
export class PurchaseImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  /** The UBL `cbc:ID` as-is (it already includes the prefix). */
  @Column({ name: 'invoice_number', type: 'varchar', length: 50 })
  invoiceNumber: string;

  /** `YYYY-MM-DD` — a plain DATE column comes back as a string. */
  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cufe: string | null;

  /** Where the draft came from: a supplier's XML or the Excel template. */
  @Column({ type: 'varchar', length: 10, default: 'xml' })
  source: PurchaseImportSource;

  @Column({ name: 'source_filename', type: 'varchar', length: 255 })
  sourceFilename: string;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'discarded_at', type: 'timestamptz', nullable: true })
  discardedAt: Date | null;

  @Column({ name: 'confirmed_by_id', type: 'uuid', nullable: true })
  confirmedById: string | null;

  @Column({ name: 'discarded_by_id', type: 'uuid', nullable: true })
  discardedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => PurchaseImportItem, (item) => item.purchaseImport)
  items: PurchaseImportItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
