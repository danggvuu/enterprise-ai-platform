import { ProviderCapabilities, ProviderMetadata } from './types';

export class ProviderCapabilityRegistry {
  private providers: Map<string, ProviderMetadata> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.registerProvider({
      id: 'openai',
      name: 'OpenAI',
      supportedModels: ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
      capabilities: {
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsEmbeddings: true,
        maxContextWindow: 128000,
        region: 'global',
        complianceTags: ['soc2', 'hipaa', 'gdpr'],
        priority: 100,
      },
      pricing: {
        'gpt-4-turbo': { promptTokenCostPer1k: 0.01, completionTokenCostPer1k: 0.03 },
        'gpt-4o': { promptTokenCostPer1k: 0.005, completionTokenCostPer1k: 0.015 },
        'gpt-3.5-turbo': { promptTokenCostPer1k: 0.0005, completionTokenCostPer1k: 0.0015 },
      }
    });

    this.registerProvider({
      id: 'bedrock',
      name: 'AWS Bedrock',
      supportedModels: ['anthropic.claude-3-sonnet-20240229-v1:0', 'anthropic.claude-3-haiku-20240307-v1:0'],
      capabilities: {
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsEmbeddings: false, // Assuming true for specific models, but false for claude text
        maxContextWindow: 200000,
        region: 'us-east-1',
        complianceTags: ['soc2', 'hipaa', 'gdpr', 'fedramp'],
        priority: 90,
      },
      pricing: {
        'anthropic.claude-3-sonnet-20240229-v1:0': { promptTokenCostPer1k: 0.003, completionTokenCostPer1k: 0.015 },
        'anthropic.claude-3-haiku-20240307-v1:0': { promptTokenCostPer1k: 0.00025, completionTokenCostPer1k: 0.00125 },
      }
    });

    this.registerProvider({
      id: 'ollama',
      name: 'Ollama (Local)',
      supportedModels: ['llama3.2', 'phi3'],
      capabilities: {
        supportsStreaming: true,
        supportsVision: false,
        supportsToolCalling: false,
        supportsEmbeddings: true,
        maxContextWindow: 8192,
        region: 'local',
        complianceTags: ['on-prem', 'air-gapped', 'gdpr', 'hipaa'], // Local models are highly compliant by nature
        priority: 50, // Fallback or cost-saving priority
      },
      pricing: {
        'llama3.2': { promptTokenCostPer1k: 0, completionTokenCostPer1k: 0 },
      }
    });
  }

  public registerProvider(metadata: ProviderMetadata): void {
    this.providers.set(metadata.id, metadata);
  }

  public getProvider(id: string): ProviderMetadata | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values());
  }

  public getProvidersSupportingModel(model: string): ProviderMetadata[] {
    return this.getAllProviders().filter(p => p.supportedModels.includes(model));
  }
}
