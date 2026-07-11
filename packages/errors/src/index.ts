/**
 * Base class for all operational errors in the Enterprise AI Platform.
 * Ensures we can distinguish between unexpected bugs and known domain violations.
 */
export abstract class EnterpriseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a tenant violates a security or prompt injection policy.
 */
export class SecurityViolationError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'SECURITY_VIOLATION', 403);
  }
}

/**
 * Thrown when an AI Provider (e.g. Bedrock/OpenAI) fails or rate limits.
 */
export class ProviderError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'PROVIDER_ERROR', 502);
  }
}

/**
 * Thrown when a tenant exceeds their token or request quota.
 */
export class QuotaExceededError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'QUOTA_EXCEEDED', 429);
  }
}

/**
 * Thrown when an authentication token or API key is missing or invalid.
 */
export class UnauthorizedError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Thrown when the database is unavailable.
 */
export class DatabaseUnavailableError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'DATABASE_UNAVAILABLE', 503);
  }
}

/**
 * Thrown when the request to a provider times out.
 */
export class ProviderTimeoutError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'PROVIDER_TIMEOUT', 504);
  }
}

/**
 * Thrown when the gateway times out processing the request.
 */
export class GatewayTimeoutError extends EnterpriseError {
  constructor(message: string) {
    super(message, 'GATEWAY_TIMEOUT', 504);
  }
}

/**
 * Standard API Error Envelope returned by the Gateway
 */
export interface StandardErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    traceId?: string;
    recoveryHint?: string;
  };
}
