import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { EnterpriseAuth, authPlugin } from '../src/index';
import jwt from 'jsonwebtoken';

describe('Auth Plugin', () => {
  const secret = 'supersecret';

  it('should reject requests without credentials', async () => {
    const app = Fastify();
    await app.register(authPlugin, { jwtSecret: secret });
    
    app.get('/', { preValidation: [app.authenticate] }, async () => ({ hello: 'world' }));

    const res = await app.inject({ method: 'GET', url: '/' });
    assert.strictEqual(res.statusCode, 401);
  });
});
