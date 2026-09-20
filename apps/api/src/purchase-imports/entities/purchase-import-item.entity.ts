import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { SaleType } from '../../common/enums/sale-type.enum';
import { Department } from '../../departments/entities/department.entity';
import { Group } from '../../groups/entities/group.entity';
import { Product } from '../../products/entities/product.entity';
import { PurchaseImport } from './purchase-import.entity';

export type PurchaseImportMatchType = 'exact' | 'manual';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/** A draft line — working data, no soft delete; the audit trail is the movement. */
@Entity('purchase_import_items')
export class PurchaseImportItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_import_id', type: 'uuid' })
  purchaseImportId: string;

  @ManyToOne(() => PurchaseImport, (imp) => imp.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_import_id' })
  purchaseImport: PurchaseImport;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** Exactly what the XML said; never edited. */
  @Column({
    name: 'xml_quantity',
    type: 'numeric',
    precision: 14,
    scale: 4,
    transformer: decimalTransformer,
  })
  xmlQuantity: number;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  /** Display-only: never written to `products.cost` (cost is derived from the sale price). */
  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitCost: number | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  /** null = "new" (no product linked). */
  @Column({ name: 'match_type', type: 'varchar', length: 10, nullable: true })
  matchType: PurchaseImportMatchType | null;

  @Column({ name: 'new_department_id', type: 'uuid', nullable: true })
  newDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'new_department_id' })
  newDepartment: Department | null;

  @Column({ name: 'new_group_id', type: 'uuid', nullable: true })
  newGroupId: string | null;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'new_group_id' })
  newGroup: Group | null;

  @Column({ name: 'new_brand_id', type: 'uuid', nullable: true })
  newBrandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'new_brand_id' })
  newBrand: Brand | null;

  @Column({
    name: 'new_sale_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  newSalePrice: number | null;

  @Column({
    name: 'new_sale_type',
    type: 'enum',
    enum: SaleType,
    enumName: 'sale_type',
    default: SaleType.NORMAL,
  })
  newSaleType: SaleType;

  @Column({ name: 'new_tax_exempt', type: 'boolean', default: false })
  newTaxExempt: boolean;

  /** Set at confirm when this line created its product. */
  @Column({ name: 'created_product', type: 'boolean', default: false })
  createdProduct: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
