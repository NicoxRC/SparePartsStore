import { api } from '../lib/api';

export interface ThirdPartyResponse {
  identification: string;
  identificationType: string;
  companyName?: string;
  email?: string;
  firstName?: string;
  familyName?: string;
}

export interface ThirdPartyLookupQuery {
  identification: string;
  identificationType: string;
}

export async function lookupThirdParty(
  query: ThirdPartyLookupQuery,
): Promise<ThirdPartyResponse> {
  const { data } = await api.get<ThirdPartyResponse>(
    '/invoicing/third-parties',
    { params: query },
  );
  return data;
}
