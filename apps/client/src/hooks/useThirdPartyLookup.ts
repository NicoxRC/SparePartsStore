import { useQuery } from '@tanstack/react-query';
import {
  lookupThirdParty,
  type ThirdPartyLookupQuery,
} from '../services/thirdParties';

/**
 * On-demand DIAN tercero lookup — enabled only once both fields are
 * filled in, same `enabled` gate pattern as useCheckReference. Not
 * consumed by any page yet: it's built ahead of Phase 10's invoice form,
 * which is where a customer lookup naturally belongs — see
 * docs/phasesClient/PHASE_9_THIRD_PARTIES.md.
 */
export function useThirdPartyLookup(
  query: ThirdPartyLookupQuery,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['third-party-lookup', query],
    queryFn: () => lookupThirdParty(query),
    enabled: enabled && query.identification.length > 0 && query.identificationType.length > 0,
    staleTime: 30_000,
    retry: false,
  });
}
