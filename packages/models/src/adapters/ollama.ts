import { ChatRequest, ChatResponse, ModelAdapter } from '../types';
import { ProviderError } from '@enterprise/errors';

export class OllamaAdapter implements ModelAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const payload = {
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.max_tokens,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const body = await response.json() as any;

      return {
        id: 'ollama-' + Date.now(),
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: body.message.role,
              content: body.message.content,
            },
            finish_reason: body.done_reason || 'stop',
          },
        ],
        usage: {
          prompt_tokens: body.prompt_eval_count || 0,
          completion_tokens: body.eval_count || 0,
          total_tokens: (body.prompt_eval_count || 0) + (body.eval_count || 0),
        },
      };
    } catch (error: any) {
      throw new ProviderError(`Ollama Error: ${error.message}`);
    }
  }
}
