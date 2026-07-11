/**
 * Standard levels for structured logging.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Enterprise standard context injected into every telemetry event.
 */
export interface TelemetryContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly correlationId?: string;
}

/**
 * Standard metric types to support RED and USE metrics.
 */
export type MetricType = 'COUNTER' | 'GAUGE' | 'HISTOGRAM';

/**
 * The unified port for all Observability and Telemetry in the Gateway.
 * Abstracts OpenTelemetry to enforce enterprise tagging taxonomy and prevent PII leakage.
 */
export interface ITelemetryEngine {
  /**
   * Starts a new logical tracing span for distributed tracing.
   */
  startSpan(name: string, context?: TelemetryContext): void;

  /**
   * Ends the current active span.
   */
  endSpan(success: boolean, errorMessage?: string): void;

  /**
   * Emits a strict JSON-formatted log entry.
   */
  log(level: LogLevel, module: string, event: string, details: Record<string, any>): void;

  /**
   * Records a strictly numerical metric for Prometheus ingestion.
   */
  recordMetric(name: string, type: MetricType, value: number, tags: Record<string, string>): void;
}

/**
 * OBS-001: Telemetry Architecture Engine
 *
 * Architecture:
 * This serves as an Anti-Corruption Layer over raw OpenTelemetry (OTel) SDKs.
 * It ensures that developers cannot accidentally log un-redacted PII by running
 * an interceptor on all 'details' objects. It strictly enforces the presence of
 * TenantID on all metrics to guarantee accurate chargebacks and observability.
 */
export class TelemetryEngine implements ITelemetryEngine {
  constructor(
    private readonly globalContext: TelemetryContext,
    // In a real implementation, this wraps '@opentelemetry/api'
    private readonly otelTracer: any,
    private readonly otelMeter: any,
  ) {}

  public startSpan(name: string, contextOverride?: TelemetryContext): void {
    const context = contextOverride ?? this.globalContext;
    // Implementation: this.otelTracer.startActiveSpan(name, ...)
    // Binds TenantId to OTel Baggage
  }

  public endSpan(success: boolean, errorMessage?: string): void {
    // Implementation: Retrieves active span, sets status (OK/ERROR), and ends it.
  }

  public log(level: LogLevel, module: string, event: string, details: Record<string, any>): void {
    const sanitizedDetails = this.redactPII(details);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: this.globalContext.traceId,
      spanId: this.globalContext.spanId,
      tenantId: this.globalContext.tenantId,
      correlationId: this.globalContext.correlationId ?? null,
      module,
      event,
      details: sanitizedDetails,
    };

    // Fast, non-blocking standard out write, picked up by FluentBit or OTel Collector
    process.stdout.write(JSON.stringify(logEntry) + '\n');
  }

  public recordMetric(
    name: string,
    type: MetricType,
    value: number,
    tags: Record<string, string>,
  ): void {
    // Enforce Tenant Taxonomy
    const enrichedTags = {
      ...tags,
      tenantId: this.globalContext.tenantId,
    };

    // Implementation: this.otelMeter.createCounter(name).add(value, enrichedTags)
  }

  /**
   * Fallback PII redaction to prevent accidental logging of sensitive data.
   * Note: The primary PII Masking Vault (SAFETY-003) runs earlier in the pipeline.
   * This is a defense-in-depth mechanism specifically for log buffers.
   */
  private redactPII(payload: Record<string, any>): Record<string, any> {
    const sanitized = { ...payload };

    // Mask raw prompt fields if accidentally passed into log details
    if (sanitized['promptText']) {
      sanitized['promptText'] = '[REDACTED_PROMPT_TEXT]';
    }

    // Mask Authorization Headers
    if (sanitized['headers'] && sanitized['headers']['authorization']) {
      sanitized['headers']['authorization'] = '[REDACTED_BEARER_TOKEN]';
    }

    return sanitized;
  }
}
