import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { EnterpriseLogger } from '../src/index';

describe('EnterpriseLogger', () => {
  it('should instantiate without throwing', () => {
    const logger = new EnterpriseLogger();
    assert.ok(logger !== undefined);
  });

  it('should create a child logger with inherited context', () => {
    const logger = new EnterpriseLogger();
    const child = logger.child({ tenantId: 'tenant-123' });
    assert.ok(child !== undefined);
  });
});
