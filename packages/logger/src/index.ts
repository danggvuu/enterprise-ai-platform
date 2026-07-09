import pino, { Logger as PinoLogger } from 'pino';

export interface ITelemetryContext {
  traceId: string;
  spanId: string;
  tenantId?: string;
  userId?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface LogPayload {
  message: string;
  context?: ITelemetryContext;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface ILogger {
  debug(payload: LogPayload): void;
  info(payload: LogPayload): void;
  warn(payload: LogPayload): void;
  error(payload: LogPayload): void;
  child(context: Partial<ITelemetryContext>): ILogger;
}

export class EnterpriseLogger implements ILogger {
  private logger: PinoLogger;

  constructor(loggerInstance?: PinoLogger) {
    this.logger =
      loggerInstance ||
      pino({
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      });
  }

  private formatPayload(payload: LogPayload): object {
    return {
      msg: payload.message,
      trace_id: payload.context?.traceId,
      span_id: payload.context?.spanId,
      tenant_id: payload.context?.tenantId,
      user_id: payload.context?.userId,
      err: payload.error
        ? { message: payload.error.message, stack: payload.error.stack }
        : undefined,
      ...payload.metadata,
      ...payload.context?.attributes,
    };
  }

  debug(payload: LogPayload): void {
    this.logger.debug(this.formatPayload(payload));
  }

  info(payload: LogPayload): void {
    this.logger.info(this.formatPayload(payload));
  }

  warn(payload: LogPayload): void {
    this.logger.warn(this.formatPayload(payload));
  }

  error(payload: LogPayload): void {
    this.logger.error(this.formatPayload(payload));
  }

  child(context: Partial<ITelemetryContext>): ILogger {
    const childPino = this.logger.child({
      tenant_id: context.tenantId,
      trace_id: context.traceId,
    });
    return new EnterpriseLogger(childPino);
  }
}
