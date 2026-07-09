import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SecurityViolationError, ProviderError, QuotaExceededError } from '../src/index';

describe('EnterpriseErrors', () => {
  it('should create SecurityViolationError with code 403', () => {
    const error = new SecurityViolationError('Injection detected');
    assert.strictEqual(error.statusCode, 403);
    assert.strictEqual(error.code, 'SECURITY_VIOLATION');
    assert.strictEqual(error.message, 'Injection detected');
    assert.strictEqual(error.isOperational, true);
  });

  it('should create ProviderError with code 502', () => {
    const error = new ProviderError('Bedrock timeout');
    assert.strictEqual(error.statusCode, 502);
    assert.strictEqual(error.code, 'PROVIDER_ERROR');
  });

  it('should create QuotaExceededError with code 429', () => {
    const error = new QuotaExceededError('Monthly limit reached');
    assert.strictEqual(error.statusCode, 429);
    assert.strictEqual(error.code, 'QUOTA_EXCEEDED');
  });
});
