import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  /** Digits only, without the check digit — the supplier's identity. */
  @Column({ type: 'varchar', length: 20 })
  nit: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  dv: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;
}
