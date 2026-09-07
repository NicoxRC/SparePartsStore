import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.resolve(exception, request);

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  /**
   * Preserves the exact shape NestJS's built-in HTTP exceptions already
   * produce ({ statusCode, message, error, ...extra fields }) — several
   * exceptions in this codebase throw a custom object body (e.g.
   * JwtAuthGuard's `PasswordChangeRequired`) that the frontend matches on
   * by field name, so this filter only adds `timestamp`/`path`, never
   * renames or drops an existing key.
   */
  private resolve(
    exception: unknown,
    request: Request,
  ): { statusCode: number; body: ErrorResponseBody } {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode,
          body: { statusCode, message: exceptionResponse, timestamp, path },
        };
      }

      return {
        statusCode,
        body: {
          ...(exceptionResponse as Record<string, unknown>),
          statusCode,
          timestamp,
          path,
        } as ErrorResponseBody,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp,
        path,
      },
    };
  }
}
