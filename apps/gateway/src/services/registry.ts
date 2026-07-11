import { prisma } from '@ai-gateway/database';
import { ProviderCapabilityRegistry, ProviderMetadata, ProviderHealthMonitor, CircuitBreakerRegistry } from '@enterprise/models';

export const globalHealthMonitor = new ProviderHealthMonitor();
export const globalCircuitBreakers = new CircuitBreakerRegistry();

export async function buildRegistryForOrg(orgId: string): Promise<ProviderCapabilityRegistry> {
  const registry = new ProviderCapabilityRegistry();
  
  const providers = await prisma.providerConfig.findMany({
    where: { organizationId: orgId, isEnabled: true },
    include: { models: true }
  });

  for (const p of providers) {
    const supportedModels = p.models.map((m: any) => m.modelId);
    
    // Build pricing map
    const pricing: Record<string, any> = {};
    for (const m of p.models) {
      pricing[m.modelId] = {
        promptTokenCostPer1k: m.promptCostPer1k || 0,
        completionTokenCostPer1k: m.completionCostPer1k || 0,
      };
    }

    const metadata: ProviderMetadata = {
      id: p.name, // The unique slug to pass to ModelFactory, e.g. "my-openai"
      name: p.name,
      type: p.providerType,
      supportedModels,
      capabilities: {
        supportsStreaming: true, // Assuming true as base capability
        supportsVision: false,
        supportsToolCalling: false,
        supportsEmbeddings: false,
        maxContextWindow: Math.max(...p.models.map((m: any) => m.contextWindow), 8192),
        region: p.providerType === 'OLLAMA' ? 'local' : 'global',
        complianceTags: [],
        priority: p.priority,
      },
      pricing
    };
    
    registry.registerProvider(metadata);
  }

  // If no active providers in DB, add env-var based fallback providers to prevent platform lock-out
  if (registry.getAllProviders().length === 0) {
    // 1. Ollama fallback
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    try {
      registry.registerProvider({
        id: 'ollama',
        name: 'Ollama (Env Fallback)',
        type: 'OLLAMA',
        supportedModels: ['llama3.2', 'qwen2.5:3b', 'phi3'],
        capabilities: {
          supportsStreaming: true,
          supportsVision: false,
          supportsToolCalling: false,
          supportsEmbeddings: true,
          maxContextWindow: 8192,
          region: 'local',
          complianceTags: ['on-prem', 'gdpr'],
          priority: 50,
        },
        pricing: {
          'llama3.2': { promptTokenCostPer1k: 0, completionTokenCostPer1k: 0 },
          'qwen2.5:3b': { promptTokenCostPer1k: 0, completionTokenCostPer1k: 0 },
          'phi3': { promptTokenCostPer1k: 0, completionTokenCostPer1k: 0 },
        }
      });
    } catch {}

    // 2. OpenAI fallback
    if (process.env.OPENAI_API_KEY) {
      registry.registerProvider({
        id: 'openai',
        name: 'OpenAI (Env Fallback)',
        type: 'OPENAI',
        supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        capabilities: {
          supportsStreaming: true,
          supportsVision: true,
          supportsToolCalling: true,
          supportsEmbeddings: true,
          maxContextWindow: 128000,
          region: 'global',
          complianceTags: ['soc2', 'gdpr'],
          priority: 100,
        },
        pricing: {
          'gpt-4o': { promptTokenCostPer1k: 0.005, completionTokenCostPer1k: 0.015 },
          'gpt-4o-mini': { promptTokenCostPer1k: 0.00015, completionTokenCostPer1k: 0.0006 },
          'gpt-4-turbo': { promptTokenCostPer1k: 0.01, completionTokenCostPer1k: 0.03 },
          'gpt-3.5-turbo': { promptTokenCostPer1k: 0.0005, completionTokenCostPer1k: 0.0015 },
        }
      });
    }
  }

  return registry;
}
