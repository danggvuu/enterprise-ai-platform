import { OpenAI } from 'openai';
import { ChatRequest, ChatResponse, ModelAdapter } from '../types';
import { ProviderError } from '@enterprise/errors';

export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
      });

      return {
        id: response.id,
        model: response.model,
        choices: response.choices.map((c) => ({
          index: c.index,
          message: {
            role: c.message.role as any,
            content: c.message.content || '',
          },
          finish_reason: c.finish_reason,
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      throw new ProviderError(`OpenAI Error: ${error.message}`);
    }
  }
}
