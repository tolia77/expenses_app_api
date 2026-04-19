import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : { message: typeof raw === 'string' ? raw : undefined };

    const code =
      (typeof body.code === 'string' && body.code) || this.defaultCode(status);
    const message =
      (typeof body.message === 'string' && body.message) ||
      (Array.isArray(body.message) ? body.message.join(', ') : null) ||
      this.defaultMessage(status);
    const details = body.details;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: {
      error: { code: string; message: string; details?: unknown };
    } = {
      error: { code, message },
    };
    if (details !== undefined) payload.error.details = details;

    response.status(status).json(payload);
  }

  private defaultCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private defaultMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Bad request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not found';
      case 409:
        return 'Conflict';
      default:
        return 'Internal server error';
    }
  }
}
