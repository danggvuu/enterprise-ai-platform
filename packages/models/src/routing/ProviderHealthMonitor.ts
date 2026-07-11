import { HealthStats } from './types';

export class ProviderHealthMonitor {
  private stats: Map<string, HealthStats> = new Map();
  private readonly WINDOW_SIZE = 100; // Number of requests to keep for moving average
  private latencies: Map<string, number[]> = new Map();

  constructor() {
    // Initialization could preload state from Redis in a real distributed setup
  }

  public recordSuccess(providerId: string, latencyMs: number) {
    this.ensureProvider(providerId);
    
    const latList = this.latencies.get(providerId)!;
    latList.push(latencyMs);
    if (latList.length > this.WINDOW_SIZE) latList.shift();

    const currentStats = this.stats.get(providerId)!;
    currentStats.totalRequests++;
    
    this.updateComputedStats(providerId);
  }

  public recordFailure(providerId: string) {
    this.ensureProvider(providerId);
    
    const currentStats = this.stats.get(providerId)!;
    currentStats.totalRequests++;
    currentStats.failedRequests++;
    
    this.updateComputedStats(providerId);
  }

  private updateComputedStats(providerId: string) {
    const currentStats = this.stats.get(providerId)!;
    const latList = this.latencies.get(providerId)!;

    if (latList.length > 0) {
      const sum = latList.reduce((a, b) => a + b, 0);
      currentStats.latencyMs = sum / latList.length;
    }

    if (currentStats.totalRequests > 0) {
      currentStats.errorRate = currentStats.failedRequests / currentStats.totalRequests;
      currentStats.availability = 1.0 - currentStats.errorRate;
    }

    currentStats.lastUpdated = Date.now();
  }

  private ensureProvider(providerId: string) {
    if (!this.stats.has(providerId)) {
      this.stats.set(providerId, {
        latencyMs: 500, // Default optimistic assumption
        errorRate: 0,
        availability: 1.0,
        totalRequests: 0,
        failedRequests: 0,
        lastUpdated: Date.now(),
      });
      this.latencies.set(providerId, []);
    }
  }

  public getStats(providerId: string): HealthStats {
    this.ensureProvider(providerId);
    return this.stats.get(providerId)!;
  }
}
