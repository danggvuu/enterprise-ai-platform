import { DecisionContext } from '../../domain/decision/DecisionContext';

/**
 * Indicates the type of cache hit achieved.
 */
export type CacheHitType = 'EXACT' | 'SEMANTIC' | 'MISS';

/**
 * The standard response returned by the Memory Platform.
 */
export interface MemoryResponse {
  readonly hitType: CacheHitType;
  readonly content: string | null;
  readonly confidenceScore: number;
  readonly latencyMs: number;
  readonly source: 'REDIS' | 'VECTOR_DB' | 'NONE';
}

/**
 * Port defining the contract for specific Cache Engines (Exact, Semantic).
 */
export interface ICacheEngine {
  lookup(prompt: string, context: DecisionContext): Promise<MemoryResponse>;
  store(
    prompt: string,
    response: string,
    context: DecisionContext,
    ttlSeconds: number,
  ): Promise<void>;
}

/**
 * Port defining the Adaptive TTL calculation strategy.
 */
export interface IAdaptiveTTLEngine {
  calculateTTL(prompt: string, context: DecisionContext): number;
}

/**
 * Port defining the overarching Enterprise Memory Platform Orchestrator.
 */
export interface IMemoryPlatformOrchestrator {
  retrieve(prompt: string, context: DecisionContext): Promise<MemoryResponse>;
  memorize(prompt: string, response: string, context: DecisionContext): Promise<void>;
}

/**
 * CACHE-001: Enterprise Memory Platform Orchestrator
 *
 * Architecture:
 * This orchestrator acts as the L1/L2/L3 Memory Gateway. It defines the exact lookup flow:
 * 1. Fast path: Exact Cache (Redis/Memcached).
 * 2. Semantic path: Fallback to Vector Search (L3) if Exact misses.
 * 3. Fallback: Return MISS, forcing LLM execution.
 *
 * Storage Strategy:
 * When memorizing a new response, it calculates an adaptive TTL and stores the
 * payload asynchronously in both Exact and Semantic engines to ensure future hits.
 */
export class MemoryPlatformOrchestrator implements IMemoryPlatformOrchestrator {
  constructor(
    private readonly exactCache: ICacheEngine,
    private readonly semanticCache: ICacheEngine,
    private readonly ttlEngine: IAdaptiveTTLEngine,
  ) {}

  /**
   * Executes the multi-tiered lookup strategy.
   * Optimizes for lowest latency by checking Exact before Semantic.
   */
  public async retrieve(prompt: string, context: DecisionContext): Promise<MemoryResponse> {
    const start = performance.now();

    // 1. Policy Check: Are we allowed to cache this request?
    if (this.shouldSkipCache(context)) {
      return this.buildMissResponse(start);
    }

    // 2. L1/L2: Exact Match Lookup (Extremely Fast, O(1))
    try {
      const exactResult = await this.exactCache.lookup(prompt, context);
      if (exactResult.hitType === 'EXACT') {
        return exactResult;
      }
    } catch (error) {
      // Log cache failure, but never fail the business transaction due to cache down
      console.warn('Exact Cache lookup failed, falling back to Semantic', error);
    }

    // 3. L3: Semantic Match Lookup (Requires Vector Embedding, Slower, O(log N))
    try {
      const semanticResult = await this.semanticCache.lookup(prompt, context);
      if (semanticResult.hitType === 'SEMANTIC' && semanticResult.confidenceScore >= 0.95) {
        return semanticResult;
      }
    } catch (error) {
      console.warn('Semantic Cache lookup failed', error);
    }

    // 4. Cache Miss
    return this.buildMissResponse(start);
  }

  /**
   * Stores a successful LLM response into the memory tiers.
   */
  public async memorize(prompt: string, response: string, context: DecisionContext): Promise<void> {
    if (this.shouldSkipCache(context)) return;

    // Task 5: Calculate Adaptive TTL based on context
    const ttlSeconds = this.ttlEngine.calculateTTL(prompt, context);

    if (ttlSeconds <= 0) return;

    // Fire and forget storage to prevent blocking the HTTP response to the client
    Promise.allSettled([
      this.exactCache.store(prompt, response, context, ttlSeconds),
      this.semanticCache.store(prompt, response, context, ttlSeconds),
    ]).catch((err) => console.error('Background memorization failed', err));
  }

  /**
   * Task 2: Cache Decision Logic
   * Evaluates if caching should be bypassed entirely.
   */
  private shouldSkipCache(context: DecisionContext): boolean {
    // Highly confidential data bypasses cache to prevent localized memory extraction risks
    if (context.securityLevel === 'StrictlyConfidential') return true;

    // Low latency SLA overrides semantic search (which adds overhead)
    if (context.expectedSlaMs < 200) return true;

    return false;
  }

  private buildMissResponse(startTime: number): MemoryResponse {
    return {
      hitType: 'MISS',
      content: null,
      confidenceScore: 0,
      latencyMs: performance.now() - startTime,
      source: 'NONE',
    };
  }
}
