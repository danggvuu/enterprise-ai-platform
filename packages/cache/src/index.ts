import crypto from 'crypto';
import Redis from 'ioredis';
import { ChatRequest, ChatResponse } from '@enterprise/models';

export class SemanticCache {
  private redis: Redis;
  private prefix = 'semantic_cache:';
  private ttl: number;

  constructor(redis: Redis, ttlSeconds: number = 3600) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  /**
   * Generates a deterministic hash for a given ChatRequest.
   * We hash the model and the exact message contents.
   */
  public generateKey(request: ChatRequest): string {
    const data = JSON.stringify({
      model: request.model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
    });
    
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `${this.prefix}${hash}`;
  }

  /**
   * Attempts to retrieve a cached response for the request.
   */
  public async get(request: ChatRequest): Promise<ChatResponse | null> {
    if (this.redis.status !== 'ready') return null;

    try {
      const key = this.generateKey(request);
      
      // Use Promise.race to enforce a 3s timeout on Redis get
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis GET timeout')), 3000)
      );
      
      const cached = await Promise.race([
        this.redis.get(key),
        timeoutPromise
      ]) as string | null;
      
      if (cached) {
        try {
          const response = JSON.parse(cached) as ChatResponse;
          (response as any).cached = true;
          return response;
        } catch (e) {
          return null;
        }
      }
    } catch (err) {
      console.warn(`[SemanticCache] Redis GET failed or timed out: ${(err as Error).message}. Bypassing cache.`);
    }
    
    return null;
  }

  /**
   * Stores a response in the cache.
   */
  public async set(request: ChatRequest, response: ChatResponse): Promise<void> {
    if (this.redis.status !== 'ready') return;

    try {
      const key = this.generateKey(request);
      const toStore = { ...response };
      delete (toStore as any).cached;

      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Redis SET timeout')), 3000)
      );

      await Promise.race([
        this.redis.set(key, JSON.stringify(toStore), 'EX', this.ttl),
        timeoutPromise
      ]);
    } catch (err) {
      console.warn(`[SemanticCache] Redis SET failed or timed out: ${(err as Error).message}. Skipping cache storage.`);
    }
  }
}
