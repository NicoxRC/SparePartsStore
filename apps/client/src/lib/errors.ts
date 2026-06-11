import { isAxiosError } from 'axios';

interface ApiErrorBody {
  message?: string | string[];
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
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string') {
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
