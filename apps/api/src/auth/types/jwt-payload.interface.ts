import { Permission } from '../../common/constants/permission.constant';
import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  permissions: Permission[];
}
