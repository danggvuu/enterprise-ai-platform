/**
 * The physical or logical boundary where a failure occurs.
 */
export type FailureDomain =
  | 'LLM_PROVIDER' // e.g., OpenAI, Anthropic
  | 'INFRASTRUCTURE' // e.g., Kubernetes Node, Lambda
  | 'DATA_STORE' // e.g., DynamoDB, Redis
  | 'NETWORK' // e.g., DNS, Packet Loss
  | 'SECURITY'; // e.g., IAM revoked, Certificate expired

/**
 * The specific nature of the failure.
 */
export type FailureType =
  'COMPLETE_OUTAGE' | 'LATENCY_SPIKE' | 'THROTTLING' | 'DATA_CORRUPTION' | 'UNAUTHORIZED';

/**
 * Defines the enterprise impact of a specific scenario.
 */
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * A strongly-typed definition of a known production failure.
 */
export interface FailureScenario {
  readonly scenarioId: string;
  readonly name: string;
  readonly domain: FailureDomain;
  readonly type: FailureType;
  readonly severity: Severity;

  // How the observability platform detects this failure
  readonly detectionCriteria: string;

  // How the Auto-Recovery Engine mitigates this failure (e.g., "Failover to Bedrock")
  readonly autoMitigationStrategy: string;

  // Expected time to recover if auto-mitigation fails (manual intervention)
  readonly expectedRecoveryTimeMinutes: number;
}

/**
 * RELIABILITY-002: Failure Scenario Library
 *
 * Architecture:
 * This acts as the central taxonomy for the Reliability Platform (Task 2).
 * It is an immutable catalog of everything that can possibly go wrong in the Enterprise AI Gateway.
 *
 * Usage:
 * 1. The Chaos Engine (RELIABILITY-003) uses this library to populate the GameDay UI.
 * 2. The Auto-Recovery Engine (RELIABILITY-008) maps incoming trace errors back to these
 *    scenarios to execute the correct 'autoMitigationStrategy'.
 */
export class FailureScenarioLibrary {
  // Singleton pattern for the immutable catalog
  private static readonly catalog: Map<string, FailureScenario> = new Map();

  static {
    FailureScenarioLibrary.register({
      scenarioId: 'FAIL-LLM-001',
      name: 'OpenAI Regional Timeout',
      domain: 'LLM_PROVIDER',
      type: 'LATENCY_SPIKE',
      severity: 'HIGH',
      detectionCriteria: 'P95 latency > 10000ms for 3 consecutive minutes on OpenAI routes',
      autoMitigationStrategy: 'Trigger Circuit Breaker. Reroute traffic to AWS Bedrock (Claude).',
      expectedRecoveryTimeMinutes: 0, // Handled instantly by auto-mitigation
    });

    FailureScenarioLibrary.register({
      scenarioId: 'FAIL-DB-001',
      name: 'DynamoDB Write Throttling',
      domain: 'DATA_STORE',
      type: 'THROTTLING',
      severity: 'MEDIUM',
      detectionCriteria: 'ProvisionedThroughputExceededException rate > 5%',
      autoMitigationStrategy:
        'Apply Exponential Backoff. If persistence fails, drop CostLedgerEntry to SQS Dead Letter Queue.',
      expectedRecoveryTimeMinutes: 5,
    });

    FailureScenarioLibrary.register({
      scenarioId: 'FAIL-NET-001',
      name: 'Primary Region Outage (us-east-1)',
      domain: 'NETWORK',
      type: 'COMPLETE_OUTAGE',
      severity: 'CRITICAL',
      detectionCriteria: 'API Gateway 5xx rate > 20% OR Global Accelerator Health Check Fail',
      autoMitigationStrategy: 'Global Accelerator automatically shifts 100% traffic to us-west-2.',
      expectedRecoveryTimeMinutes: 1, // DNS/BGP propagation time
    });
  }

  private static register(scenario: FailureScenario): void {
    FailureScenarioLibrary.catalog.set(scenario.scenarioId, scenario);
  }

  public static getScenario(scenarioId: string): FailureScenario | undefined {
    return FailureScenarioLibrary.catalog.get(scenarioId);
  }

  public static listByDomain(domain: FailureDomain): FailureScenario[] {
    return Array.from(FailureScenarioLibrary.catalog.values()).filter((s) => s.domain === domain);
  }
}
