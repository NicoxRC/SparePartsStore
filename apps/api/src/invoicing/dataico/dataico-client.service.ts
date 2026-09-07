import { Injectable, Logger } from '@nestjs/common';
import { DataicoApiException } from './dataico-api.exception';
import { DataicoConfig } from './dataico.config';

/**
 * Low-level authenticated HTTP client for Dataico's API. Every invoicing
 * sub-domain (resolutions, third-parties, invoices, reception-events, ...)
 * injects this instead of calling `fetch` directly — see
 * docs/ARCHITECTURE.md's "Invoicing module" section.
 *
 * Confirmed against a real "Factura electrónica estándar" request (see
 * docs/phases/PHASE_7_DATAICO_FOUNDATION.md): base URL
 * https://api.dataico.com/direct/dataico_api/v2, JSON body, and a single
 * custom `Auth-token` header — not Bearer, not OAuth. Uses Node's built-in
 * `fetch` rather than adding an HTTP client dependency.
 *
 * `baseUrl` can be overridden per call (see Phase 12 / POS Electrónico) —
 * Dataico's POS endpoints live under a different host (staging, per the
 * only reference shared so far) than the rest of the API.
 */
@Injectable()
export class DataicoClientService {
  private readonly logger = new Logger(DataicoClientService.name);

  constructor(private readonly config: DataicoConfig) {}

  post<TResponse>(
    path: string,
    body: unknown,
    baseUrl?: string,
  ): Promise<TResponse> {
    return this.request<TResponse>(
      path,
      { method: 'POST', body: JSON.stringify(body) },
      baseUrl,
    );
  }

  get<TResponse>(path: string, baseUrl?: string): Promise<TResponse> {
    return this.request<TResponse>(path, { method: 'GET' }, baseUrl);
  }

  put<TResponse>(
    path: string,
    body: unknown,
    baseUrl?: string,
  ): Promise<TResponse> {
    return this.request<TResponse>(
      path,
      { method: 'PUT', body: JSON.stringify(body) },
      baseUrl,
    );
  }

  private async request<TResponse>(
    path: string,
    init: { method: string; body?: string },
    baseUrlOverride?: string,
  ): Promise<TResponse> {
    const url = `${baseUrlOverride ?? this.config.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method,
        body: init.body,
        headers: {
          'Content-Type': 'application/json',
          'Auth-token': this.config.authToken,
        },
      });
    } catch (error) {
      this.logger.error(
        `Network error calling Dataico ${init.method} ${path}`,
        error,
      );
      throw new DataicoApiException(502, {
        message: 'Could not reach Dataico.',
      });
    }

    const rawBody = await response.text();
    const parsedBody = rawBody ? this.tryParseJson(rawBody) : undefined;

    if (!response.ok) {
      throw new DataicoApiException(response.status, parsedBody ?? rawBody);
    }

    return parsedBody as TResponse;
  }

  private tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
