import { ConfigService } from '@nestjs/config';
import { DataicoApiException } from './dataico-api.exception';
import { DataicoClientService } from './dataico-client.service';
import { DataicoConfig } from './dataico.config';

describe('DataicoClientService', () => {
  let service: DataicoClientService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'DATAICO_BASE_URL') {
          return (
            defaultValue ?? 'https://api.dataico.com/direct/dataico_api/v2'
          );
        }
        if (key === 'DATAICO_AUTH_TOKEN') {
          return 'test-token';
        }
        return defaultValue;
      }),
    } as unknown as ConfigService;

    const config = new DataicoConfig(configService);
    service = new DataicoClientService(config);

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('sends the Auth-token header and JSON content-type on every request', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ id: 'inv-1' })),
    });

    const result = await service.post('/invoices', {
      invoice: { number: '1' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.dataico.com/direct/dataico_api/v2/invoices',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Auth-token': 'test-token',
        }) as Record<string, string>,
      }),
    );
    expect(result).toEqual({ id: 'inv-1' });
  });

  it('sends a PUT request with a JSON body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify({ dian_status: 'DIAN_ACEPTADO' })),
    });

    const result = await service.put('/invoices/uuid-1', {
      actions: { send_dian: true, send_email: false },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.dataico.com/direct/dataico_api/v2/invoices/uuid-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          actions: { send_dian: true, send_email: false },
        }),
      }),
    );
    expect(result).toEqual({ dian_status: 'DIAN_ACEPTADO' });
  });

  it('uses a per-call baseUrl override instead of the configured one, when given', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await service.post(
      '/pos-invoices',
      { number: 1 },
      'https://staging.dataico.com/direct/dataico_api/v2',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://staging.dataico.com/direct/dataico_api/v2/pos-invoices',
      expect.anything(),
    );
  });

  it('throws DataicoApiException with the upstream status on a 4xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(JSON.stringify({ error: 'invalid numbering' })),
    });

    await expect(service.post('/invoices', {})).rejects.toMatchObject({
      upstreamStatus: 400,
      upstreamBody: { error: 'invalid numbering' },
    });
  });

  it('maps a network failure to a 502 DataicoApiException', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const error = (await service
      .get('/invoices/1')
      .catch((err: unknown) => err)) as DataicoApiException;

    expect(error).toBeInstanceOf(DataicoApiException);
    expect(error.upstreamStatus).toBe(502);
  });

  it('maps an upstream 500 to a 502, not a raw passthrough', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const error = (await service
      .get('/invoices/1')
      .catch((err: unknown) => err)) as DataicoApiException;

    expect(error.getStatus()).toBe(502);
    expect(error.upstreamStatus).toBe(500);
  });
});
