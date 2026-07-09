import { UserContext, TenantContext } from '../identity';

/**
 * Indicates the security classification of the data in the prompt.
 */
export type SecurityLevel = 'Public' | 'Internal' | 'Confidential' | 'StrictlyConfidential';

/**
 * Compliance boundary constraints required for the request.
 */
export type ComplianceLevel = 'Standard' | 'HIPAA' | 'SOC2' | 'GDPR' | 'FedRAMP';

/**
 * Priority levels for QoS (Quality of Service) traffic shaping.
 */
export type RequestPriority = 'Critical' | 'High' | 'Normal' | 'Batch';

/**
 * Provider health snapshot at the exact moment of the request.
 */
export interface ProviderHealth {
  readonly providerName: string;
  readonly isAvailable: boolean;
  readonly currentLatencyMs: number;
  readonly activeConnections: number;
  readonly rateLimitRemaining: number;
}

/**
 * Characteristics of the prompt submitted by the user.
 */
export interface PromptMetadata {
  readonly estimatedTokens: number;
  readonly hasImages: boolean;
  readonly systemPromptLength: number;
  readonly historyLength: number;
}

/**
 * Strict enterprise policy constraints applied to this specific request.
 */
export interface PolicyContext {
  readonly maxCostPerRequestUsd: number;
  readonly allowedProviders: string[];
  readonly blockedModels: string[];
  readonly requiredRegion?: string;
  readonly dataResidencyRequired: boolean;
}

/**
 * Real-time budget and usage constraints for the tenant.
 */
export interface BudgetContext {
  readonly monthlyBudgetUsd: number;
  readonly currentSpendUsd: number;
  readonly budgetRemainingUsd: number;
}

/**
 * The unified aggregate root that contains absolutely every piece of information
 * required for the Intelligent Decision Engine to route a request.
 *
 * This object is strictly IMMUTABLE. Once built, it represents the exact state
 * of the system and the user's constraints at t=0 of the request lifecycle.
 */
export class DecisionContext {
  constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly user: UserContext,
    public readonly tenant: TenantContext,
    public readonly securityLevel: SecurityLevel,
    public readonly complianceLevel: ComplianceLevel,
    public readonly priority: RequestPriority,
    public readonly promptMetadata: PromptMetadata,
    public readonly budget: BudgetContext,
    public readonly policy: PolicyContext,
    public readonly providerHealthSnapshots: ReadonlyArray<ProviderHealth>,
    public readonly requiresStreaming: boolean,
    public readonly minimumContextWindowRequired: number,
    public readonly expectedSlaMs: number,
  ) {}

  /**
   * Utility to check if a specific provider is healthy and allowed by policy.
   */
  public isProviderEligible(providerName: string): boolean {
    const isAllowed =
      this.policy.allowedProviders.includes(providerName) ||
      this.policy.allowedProviders.includes('*');
    if (!isAllowed) return false;

    const health = this.providerHealthSnapshots.find((p) => p.providerName === providerName);
    return health ? health.isAvailable : false;
  }

  /**
   * Utility to check if the current budget can support an estimated cost.
   */
  public isBudgetSufficient(estimatedCost: number): boolean {
    if (estimatedCost > this.policy.maxCostPerRequestUsd) return false;
    return this.budget.budgetRemainingUsd >= estimatedCost;
  }
}

/**
 * Builder pattern for safely constructing a DecisionContext.
 * Ensures all required dependencies are resolved before the engine runs.
 */
export class DecisionContextBuilder {
  private partial: Partial<DecisionContext> = {};

  public withIdentity(user: UserContext, tenant: TenantContext): this {
    this.partial.user = user;
    this.partial.tenant = tenant;
    return this;
  }

  public withSecurityAndCompliance(security: SecurityLevel, compliance: ComplianceLevel): this {
    this.partial.securityLevel = security;
    this.partial.complianceLevel = compliance;
    return this;
  }

  public withRequestConstraints(
    priority: RequestPriority,
    streaming: boolean,
    sla: number,
    minContext: number,
  ): this {
    this.partial.priority = priority;
    this.partial.requiresStreaming = streaming;
    this.partial.expectedSlaMs = sla;
    this.partial.minimumContextWindowRequired = minContext;
    return this;
  }

  public withPromptMetadata(metadata: PromptMetadata): this {
    this.partial.promptMetadata = metadata;
    return this;
  }

  public withBudgetsAndPolicies(budget: BudgetContext, policy: PolicyContext): this {
    this.partial.budget = budget;
    this.partial.policy = policy;
    return this;
  }

  public withHealthSnapshots(snapshots: ProviderHealth[]): this {
    this.partial.providerHealthSnapshots = [...snapshots];
    return this;
  }

  public build(): DecisionContext {
    if (
      !this.partial.user ||
      !this.partial.tenant ||
      !this.partial.securityLevel ||
      !this.partial.complianceLevel ||
      !this.partial.priority ||
      !this.partial.promptMetadata ||
      !this.partial.budget ||
      !this.partial.policy ||
      !this.partial.providerHealthSnapshots ||
      this.partial.requiresStreaming === undefined ||
      this.partial.minimumContextWindowRequired === undefined ||
      this.partial.expectedSlaMs === undefined
    ) {
      throw new Error(
        'DecisionContextBuilder: Incomplete context. All fields are mandatory for the Decision Engine.',
      );
    }

    return new DecisionContext(
      crypto.randomUUID(),
      new Date(),
      this.partial.user,
      this.partial.tenant,
      this.partial.securityLevel,
      this.partial.complianceLevel,
      this.partial.priority,
      this.partial.promptMetadata,
      this.partial.budget,
      this.partial.policy,
      this.partial.providerHealthSnapshots,
      this.partial.requiresStreaming,
      this.partial.minimumContextWindowRequired,
      this.partial.expectedSlaMs,
    );
  }
}
