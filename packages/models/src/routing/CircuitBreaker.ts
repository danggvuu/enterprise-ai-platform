import { CircuitState } from './types';

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  private readonly FAILURE_THRESHOLD = 5; // failures before opening circuit
  private readonly RESET_TIMEOUT_MS = 30000; // 30s before half-open

  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.state = CircuitState.HALF_OPEN;
      }
    }
    return this.state;
  }

  public recordSuccess() {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  public recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = CircuitState.OPEN;
    }
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  public getBreaker(providerId: string): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      this.breakers.set(providerId, new CircuitBreaker());
    }
    return this.breakers.get(providerId)!;
  }
}
