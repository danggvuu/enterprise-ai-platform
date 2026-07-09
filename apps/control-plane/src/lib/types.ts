export interface RequestLog {
  id: string;
  timestamp: string;
  user: string;
  department: string;
  prompt: string;
  providerId?: string;
  modelId?: string;
  strategy: string;
  latencyMs: number;
  costUsd: number;
  tokens: number;
  cacheHit: boolean;
  piiDetected: boolean;
  injectionDetected: boolean;
  status: 'success' | 'error';
  errorMessage?: string;
  responseText?: string;
}

export interface ProviderInfo {
  id: string;
  status: 'active' | 'inactive';
  latency: number;
  availability: number;
  successRate: number;
  errorRate: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  currentLoad: number;
  region: string;
  supportedModels: string[];
  priority: number;
}

export interface DashboardStats {
  totalRequests: number;
  todayRequests: number;
  averageLatency: number;
  cacheHitRatio: number;
  todayCostUsd: number;
  monthlyCostUsd: number;
  blockedPrompts: number;
  detectedPii: number;
  circuitBreakerEvents: number;
  errorRate: number;
  activeUsers: number;
  providers: {
    id: string;
    availability: number;
    latency: number;
    errorRate: number;
    circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }[];
  recentRequests: RequestLog[];
}

export interface CostStats {
  daily: { date: string; cost: number }[];
  byProvider: { name: string; cost: number }[];
  savings: {
    cache: number;
    ollama: number;
    routing: number;
  };
}

export interface CacheStats {
  cacheSize: number;
  hitRatio: number;
  missRatio: number;
  ttl: number;
  evictions: number;
  topPrompts: { prompt: string; hits: number }[];
}

export interface SecurityEvent {
  timestamp: string;
  user: string;
  type: string;
  details: string;
  status: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  executionDetails?: {
    providerId: string;
    modelId: string;
    latencyMs: number;
    costUsd: number;
    cacheHit: boolean;
    piiDetected: boolean;
    injectionDetected: boolean;
    strategy: string;
  };
}
