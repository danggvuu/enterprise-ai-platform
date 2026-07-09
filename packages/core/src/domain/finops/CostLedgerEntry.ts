import { TenantContext, UserContext } from '../identity';

/**
 * Breakdown of exact token usage for precise accounting.
 */
export interface TokenAccounting {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number; // Future-proofing for models like OpenAI o1
  readonly totalTokens: number;
}

/**
 * Metadata linking the cost to a specific model and provider execution.
 */
export interface ExecutionContext {
  readonly providerId: string; // e.g., 'aws-bedrock', 'openai'
  readonly modelId: string; // e.g., 'anthropic.claude-3-sonnet-20240229-v1:0'
  readonly region: string; // e.g., 'us-east-1'
  readonly wasCached: boolean; // True if semantic/exact cache prevented LLM call
  readonly latencyMs: number;
}

/**
 * Categorization of the prompt to help identify "Prompt Waste".
 */
export type PromptCategory =
  | 'SIMPLE_QA'
  | 'SUMMARIZATION'
  | 'CODE_GENERATION'
  | 'RAG_RETRIEVAL'
  | 'SYSTEM_BACKGROUND'
  | 'UNKNOWN';

/**
 * FINOPS-001: Enterprise Cost Ledger Entry
 *
 * Architecture:
 * This is the ultimate, immutable Aggregate Root of the FinOps platform.
 * Every single AI request (successful, failed, or cached) results in exactly one CostLedgerEntry.
 *
 * Trade-off Analysis:
 * We decouple this model entirely from specific pricing APIs (like AWS Cost Explorer).
 * By storing raw usage (Tokens) alongside calculated Cost (USD), we can rebuild or audit
 * billing historically even if provider prices change.
 */
export class CostLedgerEntry {
  public readonly transactionId: string;
  public readonly timestamp: Date;

  constructor(
    public readonly tenant: TenantContext,
    public readonly user: UserContext,
    public readonly execution: ExecutionContext,
    public readonly tokens: TokenAccounting,
    public readonly promptCategory: PromptCategory,

    // Financial Metrics
    public readonly expectedCostUsd: number, // Pre-flight calculation
    public readonly actualCostUsd: number, // Post-flight calculation
    public readonly cacheSavingsUsd: number, // Money saved by Memory Platform
    public readonly isBillable: boolean, // False if cached or failed before execution
  ) {
    this.transactionId = crypto.randomUUID();
    this.timestamp = new Date();

    this.validateConsistency();
  }

  /**
   * Calculates the accuracy of the Gateway's internal pricing oracle.
   */
  public getForecastVariancePercentage(): number {
    if (this.expectedCostUsd === 0) return 0;
    return Math.abs((this.actualCostUsd - this.expectedCostUsd) / this.expectedCostUsd) * 100;
  }

  /**
   * Audits the ledger entry to ensure strict mathematical and structural consistency
   * before it is written to the OLAP database (ClickHouse).
   */
  private validateConsistency(): void {
    if (this.actualCostUsd < 0 || this.expectedCostUsd < 0 || this.cacheSavingsUsd < 0) {
      throw new Error('CostLedgerEntry: Financial values cannot be negative.');
    }

    if (this.tokens.totalTokens < 0) {
      throw new Error('CostLedgerEntry: Token counts cannot be negative.');
    }

    if (this.execution.wasCached && this.actualCostUsd > 0 && !this.isBillable) {
      // Note: In some setups, vector search costs money, but strictly LLM generation is avoided.
      // This enforces that if we claim it was cached and not billable, cost must be zero.
      if (this.actualCostUsd > 0.0001) {
        // Floating point tolerance
        throw new Error(
          'CostLedgerEntry: Cached, non-billable requests cannot incur LLM actual costs.',
        );
      }
    }
  }
}
