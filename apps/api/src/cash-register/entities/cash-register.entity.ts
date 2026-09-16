import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Same pattern as Invoice.totalAmount — pg returns `numeric` as a string.
const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * One row per calendar day the store opens/closes its cash register — see
 * docs/GLOSSARY.md ("Caja"). Local bookkeeping, not a Dataico integration;
 * gates `InvoicesService.create` (no open register for today -> no new
 * invoice). `openedAt`/`closedAt` double as this row's own timestamps — a
 * generic `createdAt` would just duplicate `openedAt` — and there's no
 * `deletedAt`/remove endpoint since nothing references this table and a
 * day's register is never undone once closed.
 */
@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'register_date', type: 'date' })
  registerDate: string;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'opened_by_id' })
  openedBy: User | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: User | null;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalAmount: number | null;

  // Sum of that day's quotations still open (not invoiced/cancelled) at
  // close time — what was handed out on credit and not yet collected.
  // `NULL` until closed, same as totalAmount. See CashRegisterService.
  @Column({
    name: 'total_owed',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalOwed: number | null;
}
