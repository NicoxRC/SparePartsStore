import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CashMovement } from './cash-movement.entity';

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
 * `deletedAt`/remove endpoint since nothing references this table. Closing
 * is meant to be final, but a same-day close can be undone via
 * `CashRegisterService.reopen()` if it was a mistake — it just nulls
 * `closedAt`/`closedBy` and the frozen totals on this same row, never
 * touching `movements` or the invoices/quotations tied to the day. The
 * other exception to "closed is frozen" is `countedCash`/`cashDiscrepancy`,
 * correctable after close via `CashRegisterService.updateCountedCash` —
 * see there.
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

  // Cash physically counted into the drawer at open time ("base") —
  // required going forward; no default, always cashier-entered.
  @Column({
    name: 'opening_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  openingAmount: number;

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

  // Breakdown of total_amount by payment_means — read out of that day's
  // invoices' stored request_payload (not its own column there, see
  // InvoicesService). All NULL until closed. Debit/credit notes are
  // deliberately excluded from this breakdown — rare corrections, not
  // part of the day's till reconciliation.
  @Column({
    name: 'total_cash',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalCash: number | null;

  @Column({
    name: 'total_card',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalCard: number | null;

  @Column({
    name: 'total_transfer',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalTransfer: number | null;

  // opening_amount + total_cash + net cash movements — what should
  // physically be in the drawer at close time. NULL until closed.
  @Column({
    name: 'expected_cash',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  expectedCash: number | null;

  // What the cashier actually counted at close — the only field
  // `updateCountedCash` is allowed to touch after close, to fix a
  // miscount without reopening the day.
  @Column({
    name: 'counted_cash',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  countedCash: number | null;

  // counted_cash - expected_cash. Positive = surplus, negative = missing,
  // 0 = squared. Always recomputed alongside counted_cash, never edited
  // directly.
  @Column({
    name: 'cash_discrepancy',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  cashDiscrepancy: number | null;

  @OneToMany(() => CashMovement, (movement) => movement.cashRegister)
  movements: CashMovement[];
}
