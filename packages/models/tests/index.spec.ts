import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ModelFactory } from '../src/index';
import { OpenAIAdapter } from '../src/adapters/openai';
import { BedrockAdapter } from '../src/adapters/bedrock';
import { OllamaAdapter } from '../src/adapters/ollama';

describe('ModelFactory', () => {
  it('should create OpenAI adapter', () => {
    const adapter = ModelFactory.createAdapter('openai', { apiKey: 'test' });
    assert.ok(adapter instanceof OpenAIAdapter);
  });

  it('should create Bedrock adapter', () => {
    const adapter = ModelFactory.createAdapter('bedrock', { region: 'us-west-2' });
    assert.ok(adapter instanceof BedrockAdapter);
  });

  it('should create Ollama adapter', () => {
    const adapter = ModelFactory.createAdapter('ollama', { baseUrl: 'http://localhost:11434' });
    assert.ok(adapter instanceof OllamaAdapter);
  });

  it('should throw on unsupported provider', () => {
    assert.throws(() => {
      ModelFactory.createAdapter('unknown');
    });
  });
});
