/**
 * OpenAI-compatible request payload for drop-in replacement.
 */
export interface ChatCompletionRequest {
  model: string; // Used by Gateway as a 'Hint' or 'Routing Priority', not a hard constraint unless strictly enforced
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  stream?: boolean;
}

/**
 * Standardized response mimicking the OpenAI schema.
 */
export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: { role: 'assistant'; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  // Gateway-specific metadata injected transparently
  _gateway?: {
    resolvedProvider: string;
    wasCached: boolean;
    enterpriseQualityScore: number;
  };
}

/**
 * Configuration options for the Enterprise SDK.
 */
export interface GatewayClientConfig {
  apiKey?: string; // Defaults to process.env.AIGATEWAY_API_KEY
  tenantId?: string; // Defaults to process.env.AIGATEWAY_TENANT_ID
  baseURL?: string; // Defaults to https://api.gateway.enterprise.com/v1
  maxRetries?: number; // Default 3
  timeoutMs?: number; // Default 30000
}

/**
 * DX-001: Developer Platform Architecture (TypeScript SDK)
 *
 * Architecture:
 * This SDK is the primary integration point for internal product teams.
 * It is intentionally designed to be API-compatible with the official OpenAI SDK.
 * This guarantees a frictionless migration path: developers just swap the import
 * statement and provide their Gateway Tenant ID.
 */
export class GatewayClient {
  private readonly apiKey: string;
  private readonly tenantId: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;

  constructor(config: GatewayClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.AIGATEWAY_API_KEY || '';
    this.tenantId = config.tenantId || process.env.AIGATEWAY_TENANT_ID || '';
    this.baseURL = config.baseURL || 'https://api.gateway.enterprise.com/v1';
    this.maxRetries = config.maxRetries ?? 3;

    if (!this.apiKey || !this.tenantId) {
      throw new Error(
        '[DX-001] Missing Gateway Credentials. Run `aigateway doctor` to verify your environment variables.',
      );
    }
  }

  /**
   * The 'chat' namespace mimics the standard OpenAI SDK architecture.
   */
  public get chat() {
    return {
      completions: {
        create: (req: ChatCompletionRequest) => this.createChatCompletion(req),
      },
    };
  }

  private async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-Gateway-Tenant-Id': this.tenantId,
            // Automatically propagate tracing if available in the environment
            ...(process.env.TRACEPARENT && { traceparent: process.env.TRACEPARENT }),
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Transient API Error: ${response.status}`);
          }
          // Non-retryable error (e.g., 400 Bad Request, 403 Unauthorized)
          const errorBody = await response.text();
          throw new Error(`Gateway Error ${response.status}: ${errorBody}`);
        }

        return (await response.json()) as ChatCompletionResponse;
      } catch (error) {
        attempt++;
        if (attempt > this.maxRetries) {
          throw new Error(
            `[Gateway SDK] Request failed after ${this.maxRetries} retries: ${error}`,
          );
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw new Error('Unreachable');
  }
}
