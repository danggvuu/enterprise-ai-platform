import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SemanticCache } from '../src/index';

class MockRedis {
  status = 'ready';
  private data = new Map<string, string>();

  async get(key: string) {
    return this.data.get(key) || null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('SemanticCache', () => {
  const redis = new MockRedis() as any;
  const cache = new SemanticCache(redis);

  const mockRequest = {
    model: 'openai:gpt-4',
    messages: [{ role: 'user' as const, content: 'Hello' }]
  };

  const mockResponse = {
    id: '123',
    model: 'gpt-4',
    choices: [],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
  };

  it('should return null on cache miss', async () => {
    const res = await cache.get(mockRequest);
    assert.strictEqual(res, null);
  });

  it('should store and retrieve cache hits', async () => {
    await cache.set(mockRequest, mockResponse);
    const res = await cache.get(mockRequest);
    assert.ok(res);
    assert.strictEqual(res?.id, '123');
    assert.strictEqual((res as any).cached, true);
  });

  it('should ignore temperature differences when generating key', () => {
    const key1 = cache.generateKey({ ...mockRequest, temperature: 0.5 });
    const key2 = cache.generateKey({ ...mockRequest, temperature: 0.9 });
    assert.strictEqual(key1, key2);
  });
});
