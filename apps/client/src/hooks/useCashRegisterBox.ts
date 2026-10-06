import { useSyncExternalStore } from 'react';
import {
  allowedCashRegisters,
  getSelectedCashRegister,
  selectCashRegister,
  subscribeToCashRegister,
} from '../lib/cashRegisterBox';
import { useAuth } from './useAuth';

/** The till this device is working at, and the ones the user could switch
 * to. `number` is null only for an employee with no till assigned. */
export function useCashRegisterBox() {
  const { user } = useAuth();
  const allowed = allowedCashRegisters(user);
  const selected = useSyncExternalStore(subscribeToCashRegister, getSelectedCashRegister);

  return {
    number: selected !== null && allowed.includes(selected) ? selected : (allowed[0] ?? null),
    allowed,
    select: selectCashRegister,
  };
}
