import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CostTracker } from '../src/index';

describe('CostTracker', () => {
  const tracker = new CostTracker();

  it('should calculate cost correctly for gpt-4', () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 };
    const cost = tracker.calculateCost('openai:gpt-4', usage);
    
    assert.strictEqual(cost.prompt_cost_usd, 0.03);
    assert.strictEqual(cost.completion_cost_usd, 0.06);
    assert.strictEqual(cost.total_cost_usd, 0.09);
  });

  it('should be free for local models', () => {
    const usage = { prompt_tokens: 5000, completion_tokens: 5000, total_tokens: 10000 };
    const cost = tracker.calculateCost('ollama:llama3', usage);
    
    assert.strictEqual(cost.prompt_cost_usd, 0);
    assert.strictEqual(cost.completion_cost_usd, 0);
    assert.strictEqual(cost.total_cost_usd, 0);
  });
});
