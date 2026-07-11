/**
 * Purpose: Domain entities, interfaces, and exceptions for the Identity and Authentication context.
 * Dependencies: None (Pure Domain Layer)
 * Future Extension: Support for custom claims mapper implementations for Active Directory integration.
 * Performance Notes: Zero external I/O dependency. Standard class instantiations (< 100ns).
 * Security Notes: Contains user identity boundaries and strict tenant isolation contexts.
 */

/**
 * Standard Tenant Context to enforce data isolation boundaries.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly organizationUnit: string;
  readonly department: string;
  readonly environment: 'dev' | 'test' | 'stg' | 'prod';
}

/**
 * Enterprise User Roles for Access Control Matrix.
 */
export type UserRole =
  'PlatformAdmin' | 'SecurityAuditor' | 'FinOpsManager' | 'Developer' | 'BusinessUser';

/**
 * Decoupled User context representing the authenticated requester.
 */
export interface UserContext {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly tenant: TenantContext;
}

/**
 * Domain representation of a Gateway API Key.
 */
export interface ApiKey {
  readonly keyId: string;
  readonly prefix: string;
  readonly hash: string;
  readonly teamName: string;
  readonly allowedModels: string[];
  readonly rateLimitPerMinute: number;
  readonly rateLimitPerDay: number;
  readonly monthlyBudgetUsd: number;
  readonly isActive: boolean;
  readonly expiresAt: Date | null;
  readonly tenant: TenantContext;
}

/**
 * Base Domain Error for Identity context.
 */
export abstract class IdentityError extends Error {
  public abstract readonly errorCode: string;
  public abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Exception thrown when authentication checks fail.
 */
export class AuthenticationFailedError extends IdentityError {
  public readonly errorCode = 'AUTHENTICATION_FAILED';
  public readonly statusCode = 401;
}

/**
 * Exception thrown when a token is expired.
 */
export class ExpiredTokenError extends IdentityError {
  public readonly errorCode = 'EXPIRED_TOKEN';
  public readonly statusCode = 401;
}

/**
 * Exception thrown when authentication format is invalid.
 */
export class InvalidTokenError extends IdentityError {
  public readonly errorCode = 'INVALID_TOKEN';
  public readonly statusCode = 401;
}

/**
 * Exception thrown when user lacks permissions to access a resource.
 */
export class AuthorizationFailedError extends IdentityError {
  public readonly errorCode = 'AUTHORIZATION_FAILED';
  public readonly statusCode = 403;
}

/**
 * Exception thrown when a tenant boundaries violation is detected.
 */
export class TenantIsolationError extends IdentityError {
  public readonly errorCode = 'TENANT_ISOLATION_FAILED';
  public readonly statusCode = 403;
}

/**
 * Exception thrown when quota limits are breached.
 */
export class RateLimitExceededError extends IdentityError {
  public readonly errorCode = 'RATE_LIMIT_EXCEEDED';
  public readonly statusCode = 429;
}
