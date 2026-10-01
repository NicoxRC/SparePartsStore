import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A customer from the store's old system, loaded once from its Excel
 * export (`npm run seed:legacy-customers`). Only identity data — the
 * export had no email, phone or address. Not a `Customer`: staff look it
 * up from the sale form, complete the missing data, and the moment the
 * real customer is created the row is deleted here (see
 * CustomersService.create), so this table only shrinks.
 */
@Entity('legacy_customers')
export class LegacyCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  identificationType: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  identification: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  familyName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  secondLastName: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
