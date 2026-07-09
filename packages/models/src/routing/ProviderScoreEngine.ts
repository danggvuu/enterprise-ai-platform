import { ProviderMetadata, HealthStats, RouteRequest, RoutingStrategy } from './types';

export class ProviderScoreEngine {
  
  public calculateScore(
    provider: ProviderMetadata,
    stats: HealthStats,
    request: RouteRequest,
    strategy: RoutingStrategy
  ): number {
    let score = 0;

    // Base scores normalized to 0-100 range
    
    // 1. Health & Availability (Heavily weighted naturally)
    const availabilityScore = stats.availability * 100;
    // Penalty for high error rates
    const healthScore = Math.max(0, 100 - (stats.errorRate * 200)); 
    
    // 2. Latency Score (Lower is better, assume 2000ms is terrible = 0)
    const latencyScore = Math.max(0, 100 - (stats.latencyMs / 20));

    // 3. Cost Score (Lower is better)
    let costScore = 100;
    const modelToPrice = request.model || provider.supportedModels[0];
    if (modelToPrice && provider.pricing[modelToPrice]) {
      const p = provider.pricing[modelToPrice];
      const avgCost = (p.promptTokenCostPer1k + p.completionTokenCostPer1k) / 2;
      // Assume $0.01 per 1k is average (50). 
      costScore = Math.max(0, 100 - (avgCost * 5000));
    }

    // 4. Capability Score (Does it meet requested features?)
    let capabilityScore = 100;
    if (request.requiredFeatures) {
      for (const req of request.requiredFeatures) {
        if (req === 'streaming' && !provider.capabilities.supportsStreaming) capabilityScore -= 25;
        if (req === 'vision' && !provider.capabilities.supportsVision) capabilityScore -= 100;
        if (req === 'tool-calling' && !provider.capabilities.supportsToolCalling) capabilityScore -= 100;
        if (req === 'embeddings' && !provider.capabilities.supportsEmbeddings) capabilityScore -= 100;
      }
    }

    // 5. Compliance Score
    let complianceScore = 100;
    if (request.requiredCompliance) {
      for (const tag of request.requiredCompliance) {
        if (!provider.capabilities.complianceTags.includes(tag)) {
          complianceScore -= 100; // Hard fail effectively
        }
      }
    }

    // 6. Context Window Score
    let contextScore = 100;
    if (request.minimumContextWindow) {
      if (provider.capabilities.maxContextWindow < request.minimumContextWindow) {
        contextScore = 0;
      } else {
        contextScore = Math.min(100, (provider.capabilities.maxContextWindow / request.minimumContextWindow) * 50);
      }
    }

    // 7. Priority Score
    const priorityScore = provider.capabilities.priority;

    // Calculate final weighted score
    const w = strategy.weights;
    score = 
      (capabilityScore * w.capability) +
      (healthScore * w.health) +
      (latencyScore * w.latency) +
      (costScore * w.cost) +
      (availabilityScore * w.availability) +
      (priorityScore * w.priority) +
      (complianceScore * w.compliance) +
      (contextScore * w.contextWindow);

    return score;
  }
}
