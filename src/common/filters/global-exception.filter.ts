import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DomainError } from '../exceptions/domain.errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Single source of truth for `DomainError.code` → HTTP status. Domain errors
   * carry no HTTP knowledge of their own; the mapping lives here so we can swap
   * the transport (gRPC, queue worker, CLI) without touching service code.
   * Adding a new error: subclass DomainError in domain.errors.ts and add a row.
   */
  private static readonly STATUS_BY_CODE: Record<string, HttpStatus> = {
    CATEGORY_NOT_FOUND: HttpStatus.NOT_FOUND,
    EXPENSE_NOT_FOUND: HttpStatus.NOT_FOUND,
    MERCHANT_NOT_FOUND: HttpStatus.NOT_FOUND,
    RECEIPT_NOT_FOUND: HttpStatus.NOT_FOUND,
    RECEIPT_HAS_NO_PHOTO: HttpStatus.NOT_FOUND,
    PHOTO_REQUIRED: HttpStatus.BAD_REQUEST,
    INVALID_PHOTO_TYPE: HttpStatus.BAD_REQUEST,
    USER_ALREADY_EXISTS: HttpStatus.CONFLICT,
    INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
    UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
    VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.normalize(exception);

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

  private normalize(exception: unknown): {
    status: HttpStatus;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof DomainError) {
      const status =
        GlobalExceptionFilter.STATUS_BY_CODE[exception.code] ??
        HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
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
      return { status, code, message, details: body.details };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: this.defaultCode(HttpStatus.INTERNAL_SERVER_ERROR),
      message: this.defaultMessage(HttpStatus.INTERNAL_SERVER_ERROR),
    };
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
