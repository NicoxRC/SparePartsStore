import { isAxiosError } from 'axios';

interface ApiErrorBody {
  message?: string | string[];
  upstreamBody?: unknown;
}

/**
 * `DataicoApiException` (shared by invoices/POS/payroll) puts Dataico's own
 * error text in `upstreamBody` — usually a parsed object, but a raw JSON
 * string when Dataico's body couldn't be parsed (e.g. a literal unescaped
 * newline inside a string value, seen in the wild) — behind a generic
 * `message` like "Dataico rejected the request." Extract it so DIAN/Dataico
 * validation failures are actionable, not a generic failure.
 */
function extractUpstreamDetail(upstreamBody: unknown): string | undefined {
  let parsed: Record<string, unknown> | undefined;

  if (upstreamBody && typeof upstreamBody === 'object') {
    parsed = upstreamBody as Record<string, unknown>;
  } else if (typeof upstreamBody === 'string') {
    try {
      parsed = JSON.parse(upstreamBody) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  } else {
    return undefined;
  }

  const detail = parsed.errors ?? parsed.message ?? parsed.error;
  return typeof detail === 'string' ? detail : undefined;
}

/**
 * Extracts a human-readable message from an Axios error returned by the
 * NestJS API (which typically responds with `{ message, statusCode, error }`).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    const data = error.response?.data;
    const rawMessage = data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : undefined;
    const upstreamDetail = extractUpstreamDetail(data?.upstreamBody);

    if (message && upstreamDetail && message !== upstreamDetail) {
      return `${message} ${upstreamDetail}`;
    }
    if (upstreamDetail) {
      return upstreamDetail;
    }
    if (message) {
      return message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
