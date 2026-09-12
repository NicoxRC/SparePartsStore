import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed access to Dataico's connection settings. Confirmed against a real
 * request shared for the "Factura electrónica estándar" collection — see
 * docs/phases/PHASE_7_DATAICO_FOUNDATION.md. Auth is a custom `Auth-token`
 * header (not Bearer/OAuth), so there is no token refresh flow to manage.
 */
@Injectable()
export class DataicoConfig {
  constructor(private readonly configService: ConfigService) {}

  get baseUrl(): string {
    return this.configService.get<string>(
      'DATAICO_BASE_URL',
      'https://api.dataico.com/direct/dataico_api/v2',
    );
  }

  /**
   * POS Electrónico (Phase 12) lives on a different Dataico host than
   * everything else in this integration — the only reference shared so far
   * points at a staging environment (`staging.dataico.com`), not the
   * production `api.dataico.com` used elsewhere. Kept as its own variable,
   * separate from `DATAICO_BASE_URL`, so swapping in the real production
   * POS URL later is a one-variable change, not a code change — and so it
   * can never accidentally make the rest of the API (invoices, resolutions,
   * terceros) point at staging too.
   */
  get posBaseUrl(): string {
    return this.configService.get<string>(
      'DATAICO_POS_BASE_URL',
      'https://staging.dataico.com/direct/dataico_api/v2',
    );
  }

  /**
   * Nómina Electrónica (Phase 15) lives under a different API path than
   * everything else — `/direct/payroll-api/v2` instead of
   * `/direct/dataico_api/v2` — same host, different service. Kept as its
   * own variable for the same reason as `posBaseUrl`: a one-variable
   * change instead of a code change if this ever needs to point
   * somewhere else.
   */
  get payrollBaseUrl(): string {
    return this.configService.get<string>(
      'DATAICO_PAYROLL_BASE_URL',
      'https://api.dataico.com/direct/payroll-api/v2',
    );
  }

  get authToken(): string {
    const token = this.configService.get<string>('DATAICO_AUTH_TOKEN');
    if (!token) {
      throw new Error(
        'DATAICO_AUTH_TOKEN is not configured — set it in .env, see docs/ENVIRONMENT_VARIABLES.md',
      );
    }
    return token;
  }

  /**
   * Identifies which Dataico account invoices are issued under — confirmed
   * as a required field in the invoice payload (see
   * docs/phases/PHASE_10_INVOICING_STANDARD.md). Stable per deployment, so
   * it's configured once here rather than re-entered on every invoice.
   */
  get accountId(): string {
    const accountId = this.configService.get<string>('DATAICO_ACCOUNT_ID');
    if (!accountId) {
      throw new Error(
        'DATAICO_ACCOUNT_ID is not configured — set it in .env, see docs/ENVIRONMENT_VARIABLES.md',
      );
    }
    return accountId;
  }
}
