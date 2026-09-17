import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Permission } from '../constants/permission.constant';
import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  /** Only meaningful for `role: employee` — always `[]` for admin/auditor,
   * and never consulted for them either (see `PermissionsGuard`). */
  permissions: Permission[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
