import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { TextField } from './TextField';
import { useCustomers } from '../hooks/useCustomers';
import { useThirdPartyLookup } from '../hooks/useThirdPartyLookup';
import type { CustomerResponse } from '../services/customers';
import type { ThirdPartyResponse } from '../services/thirdParties';

interface CustomerPickerProps {
  /** Current text in the saved-customer search box (controlled by the parent form). */
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  /** Identification currently entered in the parent form — used for the DIAN lookup. */
  identification: string;
  identificationType: string;
  /** A saved customer was picked from the local search dropdown. */
  onSelectCustomer: (customer: CustomerResponse) => void;
  /** A DIAN tercero was found for `identification`/`identificationType`. */
  onDianResult: (result: ThirdPartyResponse) => void;
}

function customerLabel(customer: CustomerResponse): string {
  return (
    customer.companyName ||
    [customer.firstName, customer.familyName].filter(Boolean).join(' ') ||
    customer.identification
  );
}

/**
 * Shared "find a customer" widget for the invoice forms: a search box over
 * saved local customers, plus the DIAN tercero lookup. Deliberately dumb
 * about field-name vocabulary — both callbacks just hand back the raw
 * response object and each page decides how to map it into its own fields.
 */
export function CustomerPicker({
  searchQuery,
  onSearchQueryChange,
  identification,
  identificationType,
  onSelectCustomer,
  onDianResult,
}: CustomerPickerProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const customersQuery = useCustomers({ search: debouncedQuery, limit: 8 });
  const thirdPartyLookup = useThirdPartyLookup({ identification, identificationType }, false);

  const handleDianLookup = async () => {
    if (!identification || !identificationType) return;
    const result = await thirdPartyLookup.refetch();
    if (result.data) {
      onDianResult(result.data);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <TextField
          label="Buscar cliente guardado"
          placeholder="Identificación, razón social o nombre"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
        {searchQuery.length > 0 && customersQuery.data && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-line bg-white shadow-lg">
            {customersQuery.data.data.length === 0 ? (
              <p className="px-4 py-3 text-sm text-fog">Sin resultados.</p>
            ) : (
              customersQuery.data.data.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelectCustomer(customer)}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-mist"
                >
                  <span className="font-medium text-ink">{customerLabel(customer)}</span>
                  <span className="text-xs text-fog">
                    {customer.identificationType} {customer.identification} · {customer.email}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="sm:w-auto sm:px-4"
          isLoading={thirdPartyLookup.isFetching}
          disabled={!identification || !identificationType}
          onClick={() => void handleDianLookup()}
        >
          Buscar en DIAN
        </Button>
      </div>

      {thirdPartyLookup.isFetched && !thirdPartyLookup.data && (
        <Alert variant="info">No se encontró un tercero con esa identificación en la DIAN.</Alert>
      )}
    </div>
  );
}
