import { UserRole } from '../../common/enums/user-role.enum';

export class AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export class TokenPairDto {
  accessToken: string;
  refreshToken: string;
}

export class AuthResponseDto extends TokenPairDto {
  user: AuthUserDto;
}
