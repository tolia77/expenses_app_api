/**
 * Receipt parser error hierarchy.
 *
 * Phase 10 throws these at the service boundary. Phase 11's worker catches them
 * and maps to `ReceiptParse.error_code` values:
 *   SchemaValidationError  → 'schema_invalid'
 *   ImageProcessingError   → 'image_unreadable'
 *   OpenRouterError        → 'provider_error' | 'rate_limited' | 'auth_failed' (by HTTP status)
 */

export interface SchemaValidationDetails {
  issues?: Array<{ path: (string | number)[]; message: string; code: string }>;
  cause?: unknown;
}

export class SchemaValidationError extends Error {
  readonly name = 'SchemaValidationError';
  readonly details: SchemaValidationDetails;

  constructor(message: string, details: SchemaValidationDetails = {}) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

export interface ImageProcessingDetails {
  format?: string;
  cause?: unknown;
}

export class ImageProcessingError extends Error {
  readonly name = 'ImageProcessingError';
  readonly details: ImageProcessingDetails;

  constructor(message: string, details: ImageProcessingDetails = {}) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, ImageProcessingError.prototype);
  }
}

export interface OpenRouterErrorDetails {
  status: number;           // HTTP status from OpenAI.APIError.status; 0 for non-HTTP failures
  errorClass: string;        // SDK error class name (e.g. 'RateLimitError', 'AuthenticationError')
  excerpt?: string;          // sanitized short body excerpt (≤200 chars, stripped of base64-looking blobs)
}

export class OpenRouterError extends Error {
  readonly name = 'OpenRouterError';
  readonly details: OpenRouterErrorDetails;

  constructor(message: string, details: OpenRouterErrorDetails) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}
