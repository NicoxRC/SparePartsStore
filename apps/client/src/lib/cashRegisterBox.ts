import type { AuthUser } from '../services/auth';
import type { PermissionCode } from './permissions';

/**
 * The store's physical tills — mirrors
 * apps/api/src/common/constants/cash-register.constant.ts, kept in sync by
 * hand like the permission catalog. Which one this device is working at is
 * remembered in localStorage and sent on every request (see lib/api.ts), so
 * a sale, quotation, note or cash movement lands in that till's accounts.
 */
export const CASH_REGISTER_NUMBERS = [1, 2] as const;

export const CASH_REGISTER_HEADER = 'X-Cash-Register';

const STORAGE_KEY = 'casarespuestos.cashRegisterNumber';

const listeners = new Set<() => void>();

/** The tills this user may work at — every one for an admin, the granted
 * `cash_register.box_N` ones for an employee. */
export function allowedCashRegisters(user: AuthUser | null): number[] {
  if (!user) return [];
  if (user.role !== 'employee') return [...CASH_REGISTER_NUMBERS];
  return CASH_REGISTER_NUMBERS.filter((number) =>
    user.permissions.includes(`cash_register.box_${number}` as PermissionCode),
  );
}

export function getSelectedCashRegister(): number | null {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return CASH_REGISTER_NUMBERS.find((number) => number === stored) ?? null;
}

export function selectCashRegister(number: number): void {
  localStorage.setItem(STORAGE_KEY, String(number));
  listeners.forEach((listener) => listener());
}

export function subscribeToCashRegister(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Keeps the remembered till valid for whoever is signed in — called as soon
 * as the user is known, before any page fires a request. Someone else's
 * choice on a shared device (or a till taken away by an admin) falls back
 * to the user's first till instead of being sent and refused.
 */
export function syncSelectedCashRegister(user: AuthUser): void {
  const allowed = allowedCashRegisters(user);
  const selected = getSelectedCashRegister();
  if (selected !== null && allowed.includes(selected)) return;

  if (allowed.length > 0) {
    localStorage.setItem(STORAGE_KEY, String(allowed[0]));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
