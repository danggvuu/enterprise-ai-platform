export interface ITelemetryContext {
  /**
   * W3C Standard Trace ID. Unique identifier for the entire transaction.
   * Spans across microservices.
   */
  readonly traceId: string;

  /**
   * W3C Standard Span ID. Unique identifier for the specific operation.
   */
  readonly spanId: string;

  /**
   * The Enterprise Tenant executing this transaction.
   * CRITICAL for FinOps and Security isolation.
   */
  readonly tenantId?: string;

  /**
   * The specific end-user (human or agent) executing the transaction.
   */
  readonly userId?: string;

  /**
   * Key-value pairs for arbitrary structured metadata.
   */
  readonly attributes?: Record<string, string | number | boolean>;
}
