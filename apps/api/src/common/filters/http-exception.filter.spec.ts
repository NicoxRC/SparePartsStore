import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

interface CapturedBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock<void, [CapturedBody]>;
  let statusMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn<void, [CapturedBody]>();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method: 'GET', url: '/api/products' }),
      }),
    } as unknown as ArgumentsHost;
  });

  function capturedBody(): CapturedBody {
    return jsonMock.mock.calls[0][0];
  }

  it('preserves every field of a custom HttpException body and adds timestamp/path', () => {
    const exception = new ForbiddenException({
      statusCode: 403,
      error: 'PasswordChangeRequired',
      message: 'You must change your password before continuing.',
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = capturedBody();
    expect(body.statusCode).toBe(403);
    expect(body.error).toBe('PasswordChangeRequired');
    expect(body.message).toBe(
      'You must change your password before continuing.',
    );
    expect(body.path).toBe('/api/products');
    expect(typeof body.timestamp).toBe('string');
  });

  it("wraps NestJS's built-in object body (e.g. BadRequestException) unchanged plus timestamp/path", () => {
    const exception = new BadRequestException('Stock insuficiente');

    filter.catch(exception, host);

    const body = capturedBody();
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Stock insuficiente');
    expect(body.error).toBe('Bad Request');
  });

  it('wraps a raw string-response HttpException (bypassing the built-in subclasses) into the standard shape', () => {
    const exception = new HttpException('Stock insuficiente', 400);

    filter.catch(exception, host);

    const body = capturedBody();
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Stock insuficiente');
  });

  it('maps an unknown (non-HttpException) error to a generic 500', () => {
    filter.catch(new Error('unexpected failure'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    const body = capturedBody();
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
