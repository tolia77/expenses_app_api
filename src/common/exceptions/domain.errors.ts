/**
 * Domain errors carry a stable string `code` and an optional `details` payload.
 * They have NO knowledge of HTTP status, transport, or response shape — that
 * mapping lives in the GlobalExceptionFilter (or any other transport adapter).
 *
 * Services throw these by name (e.g. `throw new EntityNotFoundError('receipt')`).
 * Adding a new error: subclass DomainError and add a row to STATUS_BY_CODE in
 * src/common/filters/global-exception.filter.ts.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class EntityNotFoundError extends DomainError {
  readonly code: string;
  constructor(entity: string) {
    const capitalized =
      entity.charAt(0).toUpperCase() + entity.slice(1).toLowerCase();
    super(`${capitalized} not found`);
    this.code = `${entity.toUpperCase()}_NOT_FOUND`;
  }
}

export class ReceiptHasNoPhotoError extends DomainError {
  readonly code = 'RECEIPT_HAS_NO_PHOTO';
  constructor() {
    super('Receipt has no photo');
  }
}

export class PhotoRequiredError extends DomainError {
  readonly code = 'PHOTO_REQUIRED';
  constructor() {
    super('Photo file is required');
  }
}

export class InvalidPhotoTypeError extends DomainError {
  readonly code = 'INVALID_PHOTO_TYPE';
  constructor() {
    super('File must be a JPEG, PNG, or WebP image');
  }
}

// --- Auth ---
export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';
  constructor() {
    super('Email already registered');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid credentials');
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  constructor() {
    super('Unauthorized');
  }
}

// --- Validation (transport-adjacent — used by main.ts ValidationPipe) ---
export class ValidationFailedError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  constructor(details?: unknown) {
    super('Validation failed', details);
  }
}
