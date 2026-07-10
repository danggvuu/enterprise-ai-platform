import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { ChatRequest, ChatResponse, ModelAdapter } from '../types';
import { ProviderError } from '@enterprise/errors';

export class BedrockAdapter implements ModelAdapter {
  private client: BedrockRuntimeClient;

  constructor(region: string = 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Basic implementation for Anthropic Claude 3 messages API on Bedrock
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature,
        messages: request.messages.filter(m => m.role !== 'system').map((m) => ({
          role: m.role,
          content: [{ type: 'text', text: m.content }],
        })),
        system: request.messages.filter(m => m.role === 'system').map(m => m.content).join('\n') || undefined,
      };

      const command = new InvokeModelCommand({
        modelId: request.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify(payload)),
      });

      const response = await this.client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));

      return {
        id: body.id || 'bedrock-' + Date.now(),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: body.content[0].text,
            },
            finish_reason: body.stop_reason === 'end_turn' ? 'stop' : body.stop_reason,
          },
        ],
        usage: {
          prompt_tokens: body.usage?.input_tokens || 0,
          completion_tokens: body.usage?.output_tokens || 0,
          total_tokens: (body.usage?.input_tokens || 0) + (body.usage?.output_tokens || 0),
        },
      };
    } catch (error: any) {
      throw new ProviderError(`Bedrock Error: ${error.message}`);
    }
  }

  async *stream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    try {
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature,
        messages: request.messages.filter(m => m.role !== 'system').map((m) => ({
          role: m.role,
          content: [{ type: 'text', text: m.content }],
        })),
        system: request.messages.filter(m => m.role === 'system').map(m => m.content).join('\n') || undefined,
      };

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: request.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify(payload)),
      });

      const response = await this.client.send(command);

      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk && chunk.chunk.bytes) {
            const parsed = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          }
        }
      }
    } catch (error: any) {
      throw new ProviderError(`Bedrock Stream Error: ${error.message}`);
    }
  }
}
