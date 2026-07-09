import { ITelemetryContext } from './ITelemetryContext';

/**
 * Standardized logging payload.
 * Prevents arbitrary string logging, forcing developers to provide structured data.
 */
export interface LogPayload {
  message: string;
  context: ITelemetryContext;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * The core domain port for logging.
 * The Domain and Application layers will inject this interface.
 * They will never know if the underlying implementation is Pino, Winston, or AWS CloudWatch.
 */
export interface ILogger {
  debug(payload: LogPayload): void;
  info(payload: LogPayload): void;
  warn(payload: LogPayload): void;
  error(payload: LogPayload): void;

  /**
   * Creates a child logger with pre-bound context.
   * Useful when an AI Agent starts a workflow, ensuring all subsequent logs
   * from that agent automatically inherit its Trace ID and Tenant ID.
   */
  child(context: Partial<ITelemetryContext>): ILogger;
}
