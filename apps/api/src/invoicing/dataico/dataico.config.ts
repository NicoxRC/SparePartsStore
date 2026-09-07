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

  get authToken(): string {
    const token = this.configService.get<string>('DATAICO_AUTH_TOKEN');
    if (!token) {
      throw new Error(
        'DATAICO_AUTH_TOKEN is not configured — set it in .env, see docs/ENVIRONMENT_VARIABLES.md',
      );
    }
    return token;
  }
}
