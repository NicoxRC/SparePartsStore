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
 * same convention as InventoryMovement: a resolution is never edited, only
 * superseded by associating a new one (or deleted, if entered wrong and no
 * invoice was numbered under it — see ResolutionsService.remove). The most
 * recently created row for a given (documentType, subtype) is the active
 * one — there is no separate "is this active" flag. (Not `prefix`: this
 * table's `prefix` is an output of picking the active resolution, not an
 * input the caller already knows — `subtype` is what a caller like
 * InvoicesService actually specifies up front, e.g. `'ELECTRONICO'`, to
 * avoid ever picking up a resolution created for a different purpose.)
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
   * Always `ELECTRONICO` now (see resolution.constants.ts) — no longer
   * user-entered. Still a plain string, not an enum.
   */
  @Column({ type: 'varchar', length: 50 })
  subtype: string;

  @Column({ name: 'resolution_code', type: 'varchar', length: 50 })
  resolutionCode: string;

  @Column({ name: 'resolution_number', type: 'varchar', length: 50 })
  resolutionNumber: string;

  @Column({ name: 'range_start', type: 'int' })
  rangeStart: number;

  @Column({ name: 'range_end', type: 'int' })
  rangeEnd: number;

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
