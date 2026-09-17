import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../common/constants/permission.constant';
import { UserRole } from '../../common/enums/user-role.enum';

export class AuthUserDto {
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
  mustChangePassword: boolean;

  @ApiProperty({ type: [String] })
  permissions: Permission[];
}

export class TokenPairDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
