import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CashRegister } from './cash-register.entity';

const decimalTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};

/**
 * A manual cash-in/cash-out against a day's register that isn't a sale —
 * e.g. change brought in, cash pulled out for a supplier payment. See
 * docs/GLOSSARY.md ("Caja"). Append-only, same convention as
 * InventoryMovement: direction is the sign of `amount` (positive =
 * entrada, negative = salida), not a separate type column — there's no
 * "why" taxonomy to justify one beyond the required `reason` text, unlike
 * InventoryMovement's initial/purchase/adjustment provenance. A mistake is
 * corrected with an opposite-signed entry, never edited or deleted.
 * Deliberately cash-only (no payment-method field): these exist to
 * reconcile the physical till, so a card/transfer "movement" doesn't apply.
 */
@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CashRegister, (register) => register.movements, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cash_register_id' })
  cashRegister: CashRegister;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
