import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Quotation } from './quotation.entity';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * One product line on a quotation. Own table (not JSONB on `quotations`)
 * because QuotationsService.updateItems() diffs old vs. new items by
 * product to compute the right signed inventory movement per change.
 *
 * `unitPrice` is a snapshot of `product.salePrice` (the price before IVA;
 * IVA is added on top when the quotation is totalled) taken when the product
 * is first added — the "locked price" the customer keeps regardless of later product price changes.
 * `product.reference`/`description` are NOT snapshotted — unlike price,
 * they're not something a customer was promised, so the current product
 * record is joined for display instead.
 *
 * No soft delete: a row removed by an edit has no further use once the
 * inventory movement it triggered (the real audit trail) is recorded.
 */
@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quotation, (quotation) => quotation.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  // null for a one-off line typed on the quotation (not a catalog product):
  // then `description` carries its name and there is no stock to move.
  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2 })
  taxRate: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  discount: number | null;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
