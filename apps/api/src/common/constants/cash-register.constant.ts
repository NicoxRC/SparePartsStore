import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { UserRole } from '../enums/user-role.enum';

/**
 * The store's physical tills — see docs/GLOSSARY.md ("Caja"). A fixed,
 * compile-time list, not a table: the store has two and no need to manage
 * them from the app. Adding a third means a new number here plus its
 * `cash_register.box_N` permission (and the client's mirror in
 * lib/cashRegisterBox.ts).
 */
export const CASH_REGISTER_NUMBERS = [1, 2] as const;

export type CashRegisterNumber = (typeof CASH_REGISTER_NUMBERS)[number];

/** Request header naming the till the caller is working at. */
export const CASH_REGISTER_HEADER = 'x-cash-register';

type CashRegisterUser = Pick<AuthenticatedUser, 'role' | 'permissions'>;

/** The tills this user may work at and see. Only an `employee` is narrowed
 * (by its `cash_register.box_N` permissions) — same bypass as
 * `PermissionsGuard`. */
export function allowedCashRegisterNumbers(
  user: CashRegisterUser,
): CashRegisterNumber[] {
  if (user.role !== UserRole.EMPLOYEE) {
    return [...CASH_REGISTER_NUMBERS];
  }
  return CASH_REGISTER_NUMBERS.filter((number) =>
    user.permissions.includes(`cash_register.box_${number}`),
  );
}

/**
 * Which till a request is for. The header may be left out only by someone
 * with a single till — there's nothing to choose. A till the user isn't
 * allowed at is refused, never swapped for another one: the sale would land
 * in a drawer the cashier isn't looking at.
 */
export function resolveCashRegisterNumber(
  user: CashRegisterUser,
  header: string | undefined,
): CashRegisterNumber {
  const allowed = allowedCashRegisterNumbers(user);
  if (allowed.length === 0) {
    throw new ForbiddenException(
      'No tienes una caja asignada. Pide a un administrador que te asigne una.',
    );
  }

  if (header === undefined || header === '') {
    if (allowed.length === 1) {
      return allowed[0];
    }
    throw new BadRequestException('Elige en qué caja estás trabajando.');
  }

  const requested = CASH_REGISTER_NUMBERS.find(
    (number) => String(number) === header,
  );
  if (requested === undefined) {
    throw new BadRequestException('Esa caja no existe.');
  }
  if (!allowed.includes(requested)) {
    throw new ForbiddenException(
      `No tienes permiso para trabajar en la Caja ${requested}.`,
    );
  }
  return requested;
}
