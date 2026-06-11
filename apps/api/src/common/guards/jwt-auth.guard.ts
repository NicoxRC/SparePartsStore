import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) {
      return false;
    }

    const skipPasswordCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!skipPasswordCheck) {
      const request = context
        .switchToHttp()
        .getRequest<Request & { user: AuthenticatedUser }>();

      if (request.user.mustChangePassword) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'PasswordChangeRequired',
          message: 'You must change your password before continuing.',
        });
      }
    }

    return true;
  }
}
