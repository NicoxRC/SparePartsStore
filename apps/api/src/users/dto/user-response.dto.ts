import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../common/constants/permission.constant';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  mustChangePassword: boolean;

  @ApiProperty({
    type: [String],
    description: 'Only meaningful when role is employee — always [] otherwise.',
  })
  permissions: Permission[];

  @ApiProperty({ nullable: true })
  lastLoginAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.mustChangePassword = user.mustChangePassword;
    dto.permissions = user.permissions;
    dto.lastLoginAt = user.lastLoginAt ? user.lastLoginAt.toISOString() : null;
    dto.createdAt = user.createdAt.toISOString();
    dto.updatedAt = user.updatedAt.toISOString();
    return dto;
  }
}
