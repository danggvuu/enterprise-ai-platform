import {
  UserContext,
  TenantContext,
  UserRole,
  AuthenticationFailedError,
  ExpiredTokenError,
  InvalidTokenError,
  TenantIsolationError,
} from '../../domain/identity';

// We utilize 'jose' for JWT verification as it is Edge runtime and AWS Lambda compatible,
// offering zero native dependencies and robust cryptographic implementations.
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';

/**
 * Port: Inbound interface for the JWT Validation capability.
 * This belongs to the Application layer in Hexagonal Architecture.
 */
export interface IJwtValidationEngine {
  /**
   * Validates a raw JWT string and translates it into an enterprise UserContext.
   * @param token The raw Bearer token string (without 'Bearer ' prefix).
   * @throws {ExpiredTokenError} If the token is cryptographically expired.
   * @throws {InvalidTokenError} If the token is malformed, corrupted, or structurally invalid.
   * @throws {TenantIsolationError} If the token lacks mandatory enterprise multi-tenant claims.
   * @throws {AuthenticationFailedError} If signature verification or claim validation fails.
   */
  validateToken(token: string): Promise<UserContext>;
}

/**
 * Configuration required for the JWT Validation Engine.
 */
export interface JwtValidationEngineConfig {
  /** The URL of the Identity Provider's JSON Web Key Set (JWKS) */
  readonly jwksUri: string;
  /** The expected issuer (iss) of the JWT */
  readonly issuer: string;
  /** The expected audience (aud) of the JWT, representing this Gateway */
  readonly audience: string;
  /** Allowed cryptographic algorithms (e.g., RS256, ES256) */
  readonly allowedAlgorithms?: string[];
}

/**
 * Adapter: Infrastructure implementation of the JWT Validation Engine.
 *
 * Performance Notes:
 * - The JWKS fetcher leverages built-in caching mechanisms provided by 'jose'.
 * - Verifications are strictly CPU-bound after initial JWKS retrieval.
 *
 * Security Notes:
 * - Strictly enforces Issuer and Audience constraints.
 * - Extracts and mandates multi-tenant boundaries (TenantContext).
 */
export class JwtValidationEngine implements IJwtValidationEngine {
  private readonly jwksSet: ReturnType<typeof createRemoteJWKSet>;
  private readonly config: JwtValidationEngineConfig;

  constructor(config: JwtValidationEngineConfig) {
    if (!config.jwksUri || !config.issuer || !config.audience) {
      throw new Error(
        'JwtValidationEngine initialization failed: jwksUri, issuer, and audience are strictly required.',
      );
    }

    this.config = config;

    // createRemoteJWKSet provides built-in JWKS caching and rate limiting
    // to prevent IdP throttling and ensure sub-millisecond validation latency.
    this.jwksSet = createRemoteJWKSet(new URL(this.config.jwksUri));
  }

  public async validateToken(token: string): Promise<UserContext> {
    if (!token || token.trim().length === 0) {
      throw new InvalidTokenError('JWT token is missing or completely empty.');
    }

    try {
      // Cryptographic verification of signature and standard claims (exp, nbf, iss, aud)
      const { payload } = await jwtVerify(token, this.jwksSet, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: this.config.allowedAlgorithms ?? ['RS256'],
      });

      return this.mapToUserContext(payload);
    } catch (error: unknown) {
      this.handleJoseError(error);
    }
  }

  /**
   * Maps an arbitrary OIDC JWT Payload into a strict enterprise UserContext.
   * Applies domain rules and enforces tenant isolation constraints.
   */
  private mapToUserContext(payload: JWTPayload): UserContext {
    // 1. Core Identity Extraction
    const userId = payload.sub;
    const email = (payload.email ?? payload.upn) as string | undefined;

    // 2. RBAC Extraction (Fallback to standard BusinessUser)
    const role = (payload['custom:role'] || payload.role || 'BusinessUser') as UserRole;

    // 3. Enterprise Tenant Context Extraction
    const tenantId = payload['custom:tenantId'] as string | undefined;
    const organizationUnit = payload['custom:orgUnit'] as string | undefined;
    const department = payload['custom:department'] as string | undefined;
    const environment = payload['custom:environment'] as
      'dev' | 'test' | 'stg' | 'prod' | undefined;

    // -- Validations --

    if (!userId) {
      throw new InvalidTokenError('Token is missing the mandatory "sub" (subject) claim.');
    }

    if (!email) {
      throw new InvalidTokenError('Token is missing the mandatory "email" or "upn" claim.');
    }

    if (!tenantId) {
      throw new TenantIsolationError(
        'Critical: Token is missing mandatory tenant isolation context ("custom:tenantId"). ' +
          'Cannot establish secure tenant boundaries.',
      );
    }

    const tenant: TenantContext = {
      tenantId,
      organizationUnit: organizationUnit || 'default',
      department: department || 'general',
      environment: environment || 'prod',
    };

    return {
      userId,
      email,
      role,
      tenant,
    };
  }

  /**
   * Translates 3rd-party cryptographic library errors (jose) into explicit
   * Enterprise Domain Exceptions (IdentityError).
   */
  private handleJoseError(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      const message = (error as any).message;

      switch (code) {
        case 'ERR_JWT_EXPIRED':
          throw new ExpiredTokenError('The provided JWT has cryptographically expired.');
        case 'ERR_JWT_INVALID':
        case 'ERR_JWT_MALFORMED':
        case 'ERR_JWS_INVALID':
        case 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED':
          throw new InvalidTokenError(`Token validation failed: ${message}`);
        case 'ERR_JWT_CLAIM_VALIDATION_FAILED':
          throw new AuthenticationFailedError(`Claim constraint validation failed: ${message}`);
        case 'ERR_JWKS_TIMEOUT':
        case 'ERR_JWKS_MULTIPLE_MATCHING_KEYS':
          throw new AuthenticationFailedError(`JWKS Key resolution failed: ${message}`);
      }
    }

    // Fallback for unexpected errors (e.g., network failure fetching JWKS)
    throw new AuthenticationFailedError(
      `Unexpected authentication failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
