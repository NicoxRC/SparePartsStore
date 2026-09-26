import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from '../../invoicing/invoices/entities/invoice.entity';
import { User } from '../../users/entities/user.entity';
import { QuotationItem } from './quotation-item.entity';

// Same pattern as Invoice.totalAmount/Product.salePrice — pg returns
// `numeric` as a string, this coerces it back to a number on read.
const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * A "cotización" — store credit: merchandise handed over before the
 * customer actually pays. Local-only, never touches Dataico directly;
 * see docs/GLOSSARY.md. Creating one (and editing its items) decrements
 * inventory exactly like a real sale, via the same InventoryService used
 * by InvoicesService — see QuotationsService.
 *
 * No stored status enum — derived from `invoicedAt`/`cancelledAt`, same
 * reasoning as `cash_registers.closed_at` (see docs/DATABASE.md): a
 * timestamp that's either null or set already tells the whole story.
 */
@Entity('quotations')
export class Quotation extends BaseEntity {
  @Column({ type: 'int' })
  number: number;

  @Column({ name: 'customer_identification_type', type: 'varchar', length: 20 })
  customerIdentificationType: string;

  @Column({ name: 'customer_identification', type: 'varchar', length: 50 })
  customerIdentification: string;

  // NIT check digit — local-only, same as customers.identification_dv.
  @Column({
    name: 'customer_identification_dv',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  customerIdentificationDv: string | null;

  @Column({ name: 'customer_party_type', type: 'varchar', length: 30 })
  customerPartyType: string;

  @Column({ name: 'customer_tax_level_code', type: 'varchar', length: 30 })
  customerTaxLevelCode: string;

  @Column({
    name: 'customer_regimen',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerRegimen: string | null;

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

  @Column({ name: 'customer_country_code', type: 'varchar', length: 5 })
  customerCountryCode: string;

  @Column({ name: 'customer_department', type: 'varchar', length: 10 })
  customerDepartment: string;

  @Column({ name: 'customer_city', type: 'varchar', length: 10 })
  customerCity: string;

  @Column({ name: 'customer_address_line', type: 'varchar', length: 255 })
  customerAddressLine: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerPhone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Cached — recomputed by QuotationsService whenever items change, so
  // the list/detail views don't need to re-sum items on every read.
  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ name: 'invoiced_at', type: 'timestamptz', nullable: true })
  invoicedAt: Date | null;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => QuotationItem, (item) => item.quotation)
  items: QuotationItem[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;
}
