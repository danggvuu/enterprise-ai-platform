export * from './types';
export * from './adapters/openai';
export * from './adapters/bedrock';
export * from './adapters/ollama';
export * from './routing';
export * from './security/encryption';
export * from './ProviderFactory';

import { OpenAIAdapter } from './adapters/openai';
import { BedrockAdapter } from './adapters/bedrock';
import { OllamaAdapter } from './adapters/ollama';
import { ModelAdapter } from './types';
import { ProviderError } from '@enterprise/errors';

export class ModelFactory {
  static createAdapter(type: string, config?: any): ModelAdapter {
    switch (type?.toUpperCase()) {
      case 'OPENAI':
      case 'CUSTOM':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.openai.com/v1');

      case 'ANTHROPIC':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.anthropic.com/v1');

      case 'GOOGLE_GEMINI':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai');

      case 'AZURE_OPENAI':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        if (!config?.baseUrl) throw new ProviderError(`AZURE_OPENAI requires a baseUrl`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl);

      case 'OPENROUTER':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://openrouter.ai/api/v1');

      case 'GROQ':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.groq.com/openai/v1');

      case 'TOGETHER':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.together.xyz/v1');

      case 'FIREWORKS':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.fireworks.ai/inference/v1');

      case 'MISTRAL':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.mistral.ai/v1');

      case 'DEEPSEEK':
        if (!config?.apiKey) throw new ProviderError(`${type} API key is required`);
        return new OpenAIAdapter(config.apiKey, config.baseUrl || 'https://api.deepseek.com/v1');

      case 'LM_STUDIO':
        return new OpenAIAdapter(config?.apiKey || 'lm-studio', config?.baseUrl || 'http://localhost:1234/v1');

      case 'VLLM':
        return new OpenAIAdapter(config?.apiKey || 'vllm', config?.baseUrl || 'http://localhost:8000/v1');

      case 'LOCAL_AI':
        return new OpenAIAdapter(config?.apiKey || 'local-ai', config?.baseUrl || 'http://localhost:8080/v1');

      case 'BEDROCK':
        return new BedrockAdapter(config?.region || 'us-east-1');

      case 'OLLAMA':
        return new OllamaAdapter(config?.baseUrl || 'http://127.0.0.1:11434');

      default:
        throw new ProviderError(`Unsupported provider type: ${type}`);
    }
  }
}
