export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostEstimate {
  prompt_cost_usd: number;
  completion_cost_usd: number;
  total_cost_usd: number;
}

export class CostTracker {
  // Simple hardcoded pricing table for the purpose of this implementation
  // In a real scenario, this would be fetched from a DB or configuration
  private pricing: Record<string, { prompt: number, completion: number }> = {
    'openai:gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
    'openai:gpt-3.5-turbo': { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
    'bedrock:anthropic.claude-3-sonnet-20240229-v1:0': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
    'bedrock:anthropic.claude-3-haiku-20240307-v1:0': { prompt: 0.00025 / 1000, completion: 0.00125 / 1000 },
    'ollama:llama3': { prompt: 0, completion: 0 }, // Local models are free
  };

  /**
   * Calculates the estimated cost of a request based on token usage
   */
  public calculateCost(model: string, usage: TokenUsage): CostEstimate {
    const rates = this.pricing[model] || this.pricing['openai:gpt-3.5-turbo']; // Fallback

    const prompt_cost_usd = usage.prompt_tokens * rates.prompt;
    const completion_cost_usd = usage.completion_tokens * rates.completion;
    const total_cost_usd = prompt_cost_usd + completion_cost_usd;

    return {
      prompt_cost_usd,
      completion_cost_usd,
      total_cost_usd,
    };
  }
}
