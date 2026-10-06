import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import {
  CASH_REGISTER_HEADER,
  CashRegisterNumber,
  resolveCashRegisterNumber,
} from '../constants/cash-register.constant';
import { AuthenticatedUser } from './current-user.decorator';

/** The till this request is for — read from the `X-Cash-Register` header
 * and checked against the caller's tills (see resolveCashRegisterNumber). */
export const CurrentCashRegister = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CashRegisterNumber => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const header = request.headers[CASH_REGISTER_HEADER];
    return resolveCashRegisterNumber(
      request.user,
      Array.isArray(header) ? header[0] : header,
    );
  },
);
