import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const REDACT_KEYS = new Set(['password', 'token', 'authorization', 'secret']);
const MAX_BODY_LEN = 500;

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const { method, originalUrl } = req;
    const body = formatBody(req);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const { statusCode } = res;
      const head = `${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(1)}ms`;
      const line = body ? `${head} ${body}` : head;
      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}

function formatBody(req: Request): string | null {
  const contentType = req.headers['content-type'] ?? '';
  if (typeof contentType === 'string' && contentType.startsWith('multipart/')) {
    return '[multipart]';
  }
  const body = req.body as unknown;
  if (body == null || typeof body !== 'object' || Object.keys(body).length === 0) {
    return null;
  }
  const json = JSON.stringify(redact(body));
  return json.length > MAX_BODY_LEN ? `${json.slice(0, MAX_BODY_LEN)}…` : json;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}
