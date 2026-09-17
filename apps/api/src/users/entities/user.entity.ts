import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Permission } from '../../common/constants/permission.constant';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 60 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /**
   * Granular per-employee permissions — see docs/GLOSSARY.md ("Permisos")
   * and common/constants/permission.constant.ts. Only meaningful for
   * `role: employee`; always `[]` for admin/auditor and never consulted
   * for them (they bypass `PermissionsGuard` entirely). A plain
   * `text[]`, not a table or a Postgres enum — this is a fixed,
   * code-owned whitelist, and enums can't have values removed later.
   */
  @Column('text', { array: true, default: '{}' })
  permissions: Permission[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;
}
