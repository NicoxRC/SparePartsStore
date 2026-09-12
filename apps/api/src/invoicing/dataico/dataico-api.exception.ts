import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Wraps a non-2xx response from Dataico's API. Passes through Dataico's own
 * status code when it's a valid client-error range (4xx) — e.g. a rejected
 * invoice payload — since that's actionable information the caller should
 * see, not swallowed into a generic failure. Anything else (network error,
 * unexpected 5xx from Dataico) maps to 502 Bad Gateway: our API is a
 * dependent of a downstream service that failed, not itself broken.
 */
export class DataicoApiException extends HttpException {
  constructor(
    public readonly upstreamStatus: number,
    public readonly upstreamBody: unknown,
  ) {
    const isClientError = upstreamStatus >= 400 && upstreamStatus < 500;
    const statusCode = isClientError ? upstreamStatus : HttpStatus.BAD_GATEWAY;

    super(
      {
        statusCode,
        error: 'DataicoApiError',
        message: 'Dataico rejected the request.',
        upstreamStatus,
        upstreamBody,
      },
      statusCode,
    );
  }
}
