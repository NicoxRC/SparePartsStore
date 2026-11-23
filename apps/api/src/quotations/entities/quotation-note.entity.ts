import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Quotation } from './quotation.entity';

/**
 * A free-text note on a quotation, written by staff ("el cliente abonó
 * $50.000", "pasa el viernes") — see docs/GLOSSARY.md ("Notas de
 * cotización"). A history: notes are never edited, only an admin removes
 * one (soft delete). Separate from `Quotation.notes`, the observation typed
 * when the quotation was made.
 */
@Entity('quotation_notes')
export class QuotationNote extends BaseEntity {
  @Index('IDX_quotation_notes_quotation_id')
  @ManyToOne(() => Quotation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ type: 'text' })
  text: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;
}
