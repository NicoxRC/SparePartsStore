import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { Permission } from '../constants/permission.constant';
import { UserRole } from '../enums/user-role.enum';

/**
 * Runs after `RolesGuard` (registered second in `AuthModule`) — `@Roles`
 * decides whether a role can reach a route at all, this decides whether
 * *this specific* employee has the finer-grained action on top of that.
 * `admin`/`auditor` always bypass: admin is a fixed superuser, and
 * auditor's fixed read-only access predates and is untouched by this
 * system — granular permissions only ever apply to `employee`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();

    if (request.user.role !== UserRole.EMPLOYEE) {
      return true;
    }

    return required.every((code) => request.user.permissions.includes(code));
  }
}
