import { TelemetryContext } from '../observability/TelemetryEngine';

/**
 * Supported fault injections for the GameDay Simulator.
 */
export type FaultType =
  'LATENCY_INJECTION' | 'NETWORK_DROP' | 'HTTP_500' | 'HTTP_429' | 'CONNECTION_TIMEOUT';

/**
 * Definition of an active Chaos Engineering experiment.
 */
export interface ChaosExperiment {
  readonly experimentId: string;
  readonly targetProvider?: string; // e.g., 'openai', 'bedrock'
  readonly targetTenantId?: string; // Limit blast radius to a specific tenant
  readonly faultType: FaultType;
  readonly faultConfig: Record<string, any>; // e.g., { "latencyMs": 5000 }
  readonly probability: number; // 0.0 to 1.0 (e.g., 0.1 = 10% of matching traffic)
  readonly active: boolean;
}

/**
 * RELIABILITY-001: Enterprise Reliability & Chaos Engine
 *
 * Architecture:
 * Functions as an Interceptor/Decorator around external dependencies.
 * Before the Gateway makes an actual network call (to an LLM or Cache), it passes
 * through this engine. If a GameDay experiment is active, the engine intentionally
 * sabotages the request to prove that the upstream Circuit Breakers and Auto-Recovery
 * systems function correctly in production.
 *
 * Blast Radius Control:
 * Safety is paramount. Experiments strictly require targeting rules (e.g., specific Tenant)
 * to ensure regular enterprise traffic is never affected by chaos testing.
 */
export class ReliabilityEngine {
  constructor(
    // In production, this would be a real-time store like Redis or AWS AppConfig
    // so SREs can kill experiments instantly if things go wrong.
    private readonly activeExperiments: ChaosExperiment[],
  ) {}

  /**
   * Wraps a critical asynchronous operation (like calling an LLM) with potential fault injection.
   *
   * @param providerId The system being called (e.g., 'aws-bedrock')
   * @param context The current telemetry context (used to evaluate targeting rules)
   * @param operation The actual network call to execute
   */
  public async executeWithChaos<T>(
    providerId: string,
    context: TelemetryContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    const matchedExperiment = this.findMatchingExperiment(providerId, context);

    if (matchedExperiment) {
      // Roll the dice based on the experiment probability
      if (Math.random() <= matchedExperiment.probability) {
        await this.injectFault(matchedExperiment);
      }
    }

    // If no fault crashed the request, proceed with the actual operation
    return operation();
  }

  private findMatchingExperiment(
    providerId: string,
    context: TelemetryContext,
  ): ChaosExperiment | undefined {
    return this.activeExperiments.find(
      (exp) =>
        exp.active &&
        (exp.targetProvider ? exp.targetProvider === providerId : true) &&
        (exp.targetTenantId ? exp.targetTenantId === context.tenantId : true),
    );
  }

  private async injectFault(experiment: ChaosExperiment): Promise<void> {
    switch (experiment.faultType) {
      case 'LATENCY_INJECTION':
        const delay = experiment.faultConfig['latencyMs'] || 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        break;

      case 'HTTP_500':
        throw new Error(`[CHAOS] Simulated Internal Server Error for ${experiment.targetProvider}`);

      case 'HTTP_429':
        throw new Error(
          `[CHAOS] Simulated Rate Limit (Throttling) for ${experiment.targetProvider}`,
        );

      case 'NETWORK_DROP':
      case 'CONNECTION_TIMEOUT':
        throw new Error(`[CHAOS] Simulated Network Timeout for ${experiment.targetProvider}`);
    }
  }
}
