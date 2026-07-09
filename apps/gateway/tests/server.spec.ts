import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

process.env.NODE_ENV = 'test';

import { buildServer, redis } from '../src/server';
import { FastifyInstance } from 'fastify';

describe('Gateway API', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer();
  });

  after(async () => {
    await app.close();
    redis.disconnect();
    // Forcefully exit to prevent hanging due to unclosed socket connections from pg/redis
    setTimeout(() => process.exit(0), 100);
  });

  it('should return 200 on /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    if(response.statusCode !== 200) console.error(response.payload); assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.status, 'ok');
    assert.ok(body.timestamp);
    assert.ok(body.redis);
  });
});

