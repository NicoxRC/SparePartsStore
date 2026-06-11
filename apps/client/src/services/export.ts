import { isAxiosError } from 'axios';
import { api } from '../lib/api';

const ARTICULOS_FILENAME = 'articulos.xlsx';
const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function extractBlobErrorMessage(error: unknown): Promise<string | null> {
  if (
    isAxiosError(error) &&
    error.response?.data instanceof Blob &&
    error.response.data.type.includes('json')
  ) {
    const text = await error.response.data.text();
    try {
      const body = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(body.message)) return body.message.join(' ');
      if (typeof body.message === 'string') return body.message;
    } catch {
      // fall through to null
    }
  }
  return null;
}

export async function exportArticulos(): Promise<void> {
  let response;
  try {
    response = await api.get('/export/articulos', { responseType: 'blob' });
  } catch (error) {
    const message = await extractBlobErrorMessage(error);
    if (message) {
      throw new Error(message, { cause: error });
    }
    throw error;
  }

  const blob = new Blob([response.data as BlobPart], { type: XLSX_MIME_TYPE });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = ARTICULOS_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
