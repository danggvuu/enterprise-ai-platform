import { ITelemetryEngine, TelemetryContext } from './TelemetryEngine';

/**
 * Standardized span names representing the distinct phases of the AI Request Timeline.
 */
export type GatewayPhase =
  | 'GATEWAY_REQUEST_TOTAL'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'SAFETY_RISK_ASSESSMENT'
  | 'SAFETY_PII_DETECTION'
  | 'SAFETY_PII_MASKING'
  | 'SAFETY_INJECTION_DETECTION'
  | 'DECISION_CONTEXT_BUILDER'
  | 'DECISION_ROUTING'
  | 'MEMORY_EXACT_CACHE_LOOKUP'
  | 'MEMORY_SEMANTIC_CACHE_LOOKUP'
  | 'LLM_PROVIDER_EXECUTION'
  | 'SAFETY_RESPONSE_VALIDATION'
  | 'FINOPS_COST_ACCOUNTING';

/**
 * Encapsulates the OTel Span object and provides type-safe methods to end it.
 */
export interface IActiveSpan {
  end(success: boolean, errorMessage?: string): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
}

/**
 * OBS-002: Distributed Tracing Engine
 *
 * Architecture:
 * Wraps the generic TelemetryEngine to provide domain-specific Distributed Tracing.
 * Enforces the "AI Request Timeline" (Task 5) by strictly typing the phases of execution
 * so developers cannot invent random span names, ensuring unified dashboards across all teams.
 */
export class DistributedTracer {
  constructor(
    private readonly telemetryEngine: ITelemetryEngine,
    private readonly currentContext: TelemetryContext,
  ) {}

  /**
   * Starts a typed Child Span under the current Trace Context.
   * Ensures that all downstream spans automatically carry the TenantID.
   */
  public startPhase(phase: GatewayPhase, attributes?: Record<string, string>): IActiveSpan {
    // In a full implementation, this calls the underlying TelemetryEngine
    // passing the current Trace Context so OTel knows this is a child span.
    this.telemetryEngine.startSpan(phase, this.currentContext);

    // Record starting metrics/attributes
    if (attributes) {
      // e.g., Set attributes on the raw span
    }

    const startTime = performance.now();

    return {
      end: (success: boolean, errorMessage?: string) => {
        const duration = performance.now() - startTime;

        // Log an event specifically for latency visualization
        this.telemetryEngine.log(success ? 'DEBUG' : 'ERROR', phase, 'PHASE_COMPLETED', {
          durationMs: duration,
          success,
          errorMessage,
        });

        // Close the underlying OTel Span
        this.telemetryEngine.endSpan(success, errorMessage);
      },
      addEvent: (name: string, eventAttrs?: Record<string, any>) => {
        // Implementation: Add OTel span event (useful for 'Cache Hit' or 'Masked 3 Entities')
        this.telemetryEngine.log('DEBUG', phase, name, eventAttrs || {});
      },
    };
  }

  /**
   * Decorator function to automatically trace any async method.
   * Usage: const result = await tracer.traceMethod('LLM_PROVIDER_EXECUTION', () => bedrockClient.invoke(...));
   */
  public async traceMethod<T>(phase: GatewayPhase, fn: () => Promise<T>): Promise<T> {
    const span = this.startPhase(phase);
    try {
      const result = await fn();
      span.end(true);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown Error';
      span.end(false, msg);
      throw error; // Re-throw to maintain standard control flow
    }
  }
}
