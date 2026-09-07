import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DianResolutionDocumentType } from '../../../common/enums/dian-resolution-document-type.enum';
import { User } from '../../../users/entities/user.entity';

/**
 * A DIAN numbering resolution successfully synced to Dataico — see
 * docs/phases/PHASE_8_RESOLUTIONS.md and docs/DATABASE.md. Append-only,
 * same convention as InventoryMovement: a resolution is never edited or
 * deleted locally, only superseded by associating a new one. The most
 * recently created row for a given (documentType, prefix) is the active
 * one — there is no separate "is this active" flag.
 */
@Entity('dian_resolutions')
export class DianResolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DianResolutionDocumentType,
    enumName: 'dian_resolution_document_type',
  })
  documentType: DianResolutionDocumentType;

  @Column({ type: 'varchar', length: 20 })
  prefix: string;

  /**
   * Only two values confirmed so far (ELECTRONICO, POS) — kept as a plain
   * validated string rather than a TypeScript enum until Dataico's full
   * valid-value list is confirmed, per CLAUDE.md's "don't guess" rule.
   */
  @Column({ type: 'varchar', length: 50 })
  subtype: string;

  @Column({ name: 'resolution_code', type: 'varchar', length: 50 })
  resolutionCode: string;

  @Column({
    name: 'resolution_code_message',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resolutionCodeMessage: string | null;

  @Column({ name: 'resolution_number', type: 'varchar', length: 50 })
  resolutionNumber: string;

  @Column({ name: 'range_start', type: 'int' })
  rangeStart: number;

  @Column({ name: 'range_end', type: 'int' })
  rangeEnd: number;

  /**
   * Only present on the INVOICE document type per the confirmed reference
   * — always null for SUPPORT_DOCS.
   */
  @Column({
    name: 'technical_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  technicalKey: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
