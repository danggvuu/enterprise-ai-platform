export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsToolCalling: boolean;
  supportsEmbeddings: boolean;
  maxContextWindow: number;
  region: string;
  complianceTags: string[]; // e.g., 'hipaa', 'gdpr', 'soc2'
  priority: number; // 0-100, higher is better
}

export interface ModelPricing {
  promptTokenCostPer1k: number;
  completionTokenCostPer1k: number;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  type?: string;
  capabilities: ProviderCapabilities;
  pricing: Record<string, ModelPricing>; // map of modelId to pricing
  supportedModels: string[];
}

export interface HealthStats {
  latencyMs: number; // Moving average
  errorRate: number; // 0.0 to 1.0
  availability: number; // 0.0 to 1.0
  totalRequests: number;
  failedRequests: number;
  lastUpdated: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface RoutingStrategy {
  name: 'cost-optimized' | 'latency-optimized' | 'balanced' | 'high-availability' | 'capability-based' | 'compliance-based' | 'region-aware' | 'context-window-aware' | 'weighted-routing' | 'canary-routing' | 'sticky-session' | 'disaster-recovery';
  weights: {
    capability: number;
    health: number;
    latency: number;
    cost: number;
    availability: number;
    priority: number;
    compliance: number;
    contextWindow: number;
  };
}

export interface RouteRequest {
  model?: string; // If specific model requested
  requiredFeatures?: ('streaming' | 'vision' | 'tool-calling' | 'embeddings')[];
  requiredCompliance?: string[];
  minimumContextWindow?: number;
  preferredRegion?: string;
  budgetCapUsd?: number;
  maxLatencyMs?: number;
  strategy?: RoutingStrategy['name'];
  customData?: Record<string, any>; // Used by policy engine
}

export interface RouteDecision {
  providerId: string;
  modelId: string;
  score: number;
  fallbackProviders?: string[];
}
