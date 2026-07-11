export * from './types';
export * from './adapters/openai';
export * from './adapters/bedrock';
export * from './adapters/ollama';
export * from './routing';

import { OpenAIAdapter } from './adapters/openai';
import { BedrockAdapter } from './adapters/bedrock';
import { OllamaAdapter } from './adapters/ollama';
import { ModelAdapter } from './types';
import { ProviderError } from '@enterprise/errors';

export class ModelFactory {
  static createAdapter(provider: string, config?: any): ModelAdapter {
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!config?.apiKey) throw new ProviderError('OpenAI API key is required');
        return new OpenAIAdapter(config.apiKey);
      case 'bedrock':
        return new BedrockAdapter(config?.region || 'us-east-1');
      case 'ollama':
        return new OllamaAdapter(config?.baseUrl || 'http://localhost:11434');
      default:
        throw new ProviderError(`Unsupported provider: ${provider}`);
    }
  }
}
