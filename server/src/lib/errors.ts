export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = new.target.name;
  }

  toJSON(): { error: string; code: string } {
    return { error: this.message, code: this.code };
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'validation_error', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'conflict', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super(413, 'payload_too_large', message);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(429, 'rate_limited', message);
    this.retryAfter = retryAfter;
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super(502, 'upstream_error', message);
  }
}

export class RagIngestError extends AppError {
  constructor(message: string) {
    super(500, 'rag_ingest_error', message);
  }
}
