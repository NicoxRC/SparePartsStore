import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SaleType } from '../../common/enums/sale-type.enum';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Group } from '../../groups/entities/group.entity';
import { Brand } from '../../brands/entities/brand.entity';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  reference: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  cost: number;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  salePrice: number;

  @Column({
    name: 'sale_type',
    type: 'enum',
    enum: SaleType,
    enumName: 'sale_type',
    default: SaleType.NORMAL,
  })
  saleType: SaleType;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Group, { nullable: false })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToOne(() => Brand, { nullable: false })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;
}
