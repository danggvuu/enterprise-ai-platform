import { ProviderCapabilityRegistry } from './ProviderCapabilityRegistry';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { ProviderScoreEngine } from './ProviderScoreEngine';
import { RoutingPolicyEngine } from './RoutingPolicyEngine';
import { CircuitBreakerRegistry } from './CircuitBreaker';
import { ProviderLoadBalancer } from './ProviderLoadBalancer';
import { RouteRequest, RouteDecision, RoutingStrategy, ProviderMetadata, CircuitState } from './types';
import { ProviderError } from '@enterprise/errors';

export class DynamicRouter {
  private capabilityRegistry: ProviderCapabilityRegistry;
  private healthMonitor: ProviderHealthMonitor;
  private scoreEngine: ProviderScoreEngine;
  private policyEngine: RoutingPolicyEngine;
  private circuitBreakers: CircuitBreakerRegistry;
  private loadBalancer: ProviderLoadBalancer;

  private defaultStrategy: RoutingStrategy = {
    name: 'balanced',
    weights: {
      capability: 1.0,
      health: 1.5,
      latency: 1.0,
      cost: 1.0,
      availability: 2.0,
      priority: 0.5,
      compliance: 2.0,
      contextWindow: 1.0,
    }
  };

  private strategies: Record<string, RoutingStrategy> = {
    'balanced': this.defaultStrategy,
    'cost-optimized': {
      name: 'cost-optimized',
      weights: { capability: 1.0, health: 1.0, latency: 0.5, cost: 3.0, availability: 1.0, priority: 0.5, compliance: 2.0, contextWindow: 0.5 }
    },
    'latency-optimized': {
      name: 'latency-optimized',
      weights: { capability: 1.0, health: 1.0, latency: 3.0, cost: 0.5, availability: 1.0, priority: 0.5, compliance: 2.0, contextWindow: 0.5 }
    },
    'high-availability': {
      name: 'high-availability',
      weights: { capability: 1.0, health: 3.0, latency: 1.0, cost: 1.0, availability: 3.0, priority: 0.5, compliance: 2.0, contextWindow: 0.5 }
    }
  };

  constructor(
    capabilityRegistry = new ProviderCapabilityRegistry(),
    healthMonitor = new ProviderHealthMonitor(),
    circuitBreakers = new CircuitBreakerRegistry()
  ) {
    this.capabilityRegistry = capabilityRegistry;
    this.healthMonitor = healthMonitor;
    this.circuitBreakers = circuitBreakers;
    this.scoreEngine = new ProviderScoreEngine();
    this.policyEngine = new RoutingPolicyEngine();
    this.loadBalancer = new ProviderLoadBalancer();
  }

  public getHealthMonitor() {
    return this.healthMonitor;
  }

  public getCircuitBreakers() {
    return this.circuitBreakers;
  }

  public route(request: RouteRequest, context: { containsPII?: boolean; budgetExceeded?: boolean } = {}): RouteDecision {
    // 1. Apply global routing policies
    const policyRequest = this.policyEngine.evaluatePolicies(request, context);
    
    // 2. Identify strategy
    const strategy = this.strategies[policyRequest.strategy || 'balanced'] || this.defaultStrategy;

    // 3. Find candidates
    let candidates: ProviderMetadata[] = [];
    if (policyRequest.model) {
      candidates = this.capabilityRegistry.getProvidersSupportingModel(policyRequest.model);
    } else {
      candidates = this.capabilityRegistry.getAllProviders();
    }

    // Filter by specific provider if requested
    if (policyRequest.providerId) {
      candidates = candidates.filter(p => p.id === policyRequest.providerId);
    }

    if (candidates.length === 0) {
      throw new ProviderError(`No providers support the requested requirements (model: ${policyRequest.model}, provider: ${policyRequest.providerId})`);
    }

    const decisions: RouteDecision[] = [];

    // 4. Evaluate each candidate
    for (const provider of candidates) {
      // Check circuit breaker
      const breaker = this.circuitBreakers.getBreaker(provider.id);
      if (breaker.getState() === CircuitState.OPEN) {
        continue; // Skip broken providers
      }

      const stats = this.healthMonitor.getStats(provider.id);
      
      const score = this.scoreEngine.calculateScore(provider, stats, policyRequest, strategy);
      
      if (score > 0) {
        console.log(`[DEBUG] Provider ${provider.id} scored ${score} for strategy ${policyRequest.strategy || 'balanced'}`);
        decisions.push({
          providerId: provider.id,
          modelId: policyRequest.model || provider.supportedModels[0], // Fallback to their default model if generic
          score,
        });
      }
    }

    if (decisions.length === 0) {
      throw new ProviderError(`All capable providers are either failing (Circuit OPEN) or scored 0 based on constraints.`);
    }

    // 5. Load balance / Rank
    const ranked = this.loadBalancer.rankProviders(decisions);
    const topDecision = ranked[0];

    // Add fallback options
    if (ranked.length > 1) {
      topDecision.fallbackProviders = ranked.slice(1).map(d => d.providerId);
    }

    return topDecision;
  }
}
