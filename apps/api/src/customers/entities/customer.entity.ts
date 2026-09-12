import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  identificationType: string;

  @Column({ type: 'varchar', length: 50 })
  identification: string;

  @Column({ type: 'varchar', length: 20 })
  partyType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  familyName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  taxLevelCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  regimen: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true, default: 'CO' })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine: string | null;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: false })
  responsableIva: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;
}
