import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { TextField } from './TextField';
import { useCustomers, useLegacyCustomerLookup } from '../hooks/useCustomers';
import { useThirdPartyLookup } from '../hooks/useThirdPartyLookup';
import { getApiErrorMessage } from '../lib/errors';
import { FINAL_CONSUMER_IDENTIFICATION } from '../lib/finalConsumer';
import { getCustomers, type CustomerResponse } from '../services/customers';
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
  /**
   * A DIAN tercero, or a customer from the old system's list, was found
   * for `identification` — both come back in the same shape.
   */
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
 * saved local customers, plus the DIAN tercero lookup and the lookup in the
 * old system's customer list (which works with Dataico off). The buttons sit
 * above the search box because the results dropdown opens below it and would
 * cover anything placed there. Deliberately dumb
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

  const legacyLookup = useLegacyCustomerLookup(identification);

  const handleLegacyLookup = async () => {
    if (!identification) return;
    const result = await legacyLookup.refetch();
    if (result.data) {
      onDianResult(result.data);
    }
  };

  const handleDianLookup = async () => {
    if (!identification || !identificationType) return;
    const result = await thirdPartyLookup.refetch();
    if (result.data) {
      onDianResult(result.data);
    }
  };

  const [isLoadingFinalConsumer, setIsLoadingFinalConsumer] = useState(false);
  const [finalConsumerError, setFinalConsumerError] = useState<string | null>(null);

  // One click for the most common "customer" at the counter: whoever
  // doesn't want to give their data.
  const handleFinalConsumer = async () => {
    setIsLoadingFinalConsumer(true);
    setFinalConsumerError(null);
    try {
      const { data } = await getCustomers({ search: FINAL_CONSUMER_IDENTIFICATION, limit: 1 });
      const match = data.find((customer) => customer.identification === FINAL_CONSUMER_IDENTIFICATION);
      if (match) {
        onSelectCustomer(match);
      } else {
        setFinalConsumerError('No se encontró el cliente Consumidor final.');
      }
    } catch (error) {
      setFinalConsumerError(getApiErrorMessage(error));
    } finally {
      setIsLoadingFinalConsumer(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="sm:w-auto sm:px-4"
          isLoading={isLoadingFinalConsumer}
          onClick={() => void handleFinalConsumer()}
        >
          Consumidor final
        </Button>
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
        <Button
          type="button"
          variant="secondary"
          className="sm:w-auto sm:px-4"
          isLoading={legacyLookup.isFetching}
          disabled={!identification}
          onClick={() => void handleLegacyLookup()}
        >
          Buscar en clientes antiguos
        </Button>
      </div>

      {finalConsumerError && <Alert variant="error">{finalConsumerError}</Alert>}

      {thirdPartyLookup.isFetched && !thirdPartyLookup.data && (
        <Alert variant="info">No se encontró un tercero con esa identificación en la DIAN.</Alert>
      )}

      {legacyLookup.isError &&
        (isAxiosError(legacyLookup.error) && legacyLookup.error.response?.status === 404 ? (
          <Alert variant="info">No se encontró esa identificación en los clientes antiguos.</Alert>
        ) : (
          <Alert variant="error">{getApiErrorMessage(legacyLookup.error)}</Alert>
        ))}

      <div className="relative">
        <TextField
          label="Buscar cliente guardado"
          placeholder="Identificación, razón social o nombre"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
        {searchQuery.length > 0 && customersQuery.data && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-line bg-paper shadow-lg">
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

    </div>
  );
}
