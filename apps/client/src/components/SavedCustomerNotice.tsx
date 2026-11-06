import { useEffect, useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import type { CustomerResponse } from '../services/customers';
import { Button } from './Button';

interface SavedCustomerNoticeProps {
  /** Identification currently typed in the form. */
  identification: string;
  /** What the form holds right now for that identification. */
  typed: {
    companyName: string;
    firstName: string;
    familyName: string;
    email: string;
  };
  onUseSaved: (customer: CustomerResponse) => void;
}

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

function savedName(customer: CustomerResponse): string {
  return (
    customer.companyName ||
    [customer.firstName, customer.familyName].filter(Boolean).join(' ') ||
    customer.identification
  );
}

/**
 * The sale only saves a customer that doesn't exist yet — a saved one is
 * edited in Clientes, never from here — so typing an identification that's
 * already saved, with a different name or email, would leave this sale
 * with data that doesn't match Clientes. This warns about it and offers the
 * saved data; the cashier decides.
 */
export function SavedCustomerNotice({ identification, typed, onUseSaved }: SavedCustomerNoticeProps) {
  const trimmed = identification.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(trimmed), 300);
    return () => clearTimeout(timeout);
  }, [trimmed]);

  // Shorter than any real document number — not worth a lookup yet.
  const customersQuery = useCustomers(
    { search: debounced, limit: 5 },
    { enabled: debounced.length >= 5 },
  );

  if (debounced !== trimmed || debounced.length < 5) return null;

  const saved = customersQuery.data?.data.find(
    (customer) => customer.identification === debounced,
  );
  if (!saved) return null;

  const matches =
    same(saved.companyName, typed.companyName) &&
    same(saved.firstName, typed.firstName) &&
    same(saved.familyName, typed.familyName) &&
    same(saved.email, typed.email);
  if (matches) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 border border-line bg-amber-tint px-4 py-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Esta identificación ya está guardada en Clientes como{' '}
        <span className="font-semibold">{savedName(saved)}</span>
        {saved.email && <> ({saved.email})</>}.
        {Object.values(typed).some((value) => value.trim())
          ? ' Los datos de aquí son distintos y no se guardarán en Clientes.'
          : ' ¿Usar sus datos?'}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0 sm:w-auto"
        onClick={() => onUseSaved(saved)}
      >
        Usar datos guardados
      </Button>
    </div>
  );
}
