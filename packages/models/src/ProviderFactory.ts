import { ProviderError } from '@enterprise/errors';

export class ProviderFactory {
  static getBaseUrl(providerType: string, customBaseUrl?: string | null): string {
    if (customBaseUrl) return customBaseUrl;
    
    switch (providerType) {
      case 'OPENAI': return 'https://api.openai.com/v1';
      case 'ANTHROPIC': return 'https://api.anthropic.com/v1';
      case 'GOOGLE_GEMINI': return 'https://generativelanguage.googleapis.com/v1beta';
      case 'OPENROUTER': return 'https://openrouter.ai/api/v1';
      case 'GROQ': return 'https://api.groq.com/openai/v1';
      case 'TOGETHER': return 'https://api.together.xyz/v1';
      case 'FIREWORKS': return 'https://api.fireworks.ai/inference/v1';
      case 'MISTRAL': return 'https://api.mistral.ai/v1';
      case 'DEEPSEEK': return 'https://api.deepseek.com/v1';
      case 'LM_STUDIO': return 'http://localhost:1234/v1';
      case 'VLLM': return 'http://localhost:8000/v1';
      case 'LOCAL_AI': return 'http://localhost:8080/v1';
      case 'OLLAMA': return 'http://127.0.0.1:11434';
      default: return 'https://api.openai.com/v1';
    }
  }

  static async testConnection(providerType: string, apiKey: string, customBaseUrl?: string | null): Promise<boolean> {
    const baseUrl = this.getBaseUrl(providerType, customBaseUrl).replace(/\/v1$/, '').replace(/\/v1beta$/, '');

    try {
      if (providerType === 'OLLAMA') {
        const res = await fetch(`${baseUrl}/api/tags`);
        return res.ok;
      }
      if (providerType === 'AZURE_OPENAI') {
        const res = await fetch(`${baseUrl}/openai/deployments?api-version=2024-02-01`, {
          headers: { 'api-key': apiKey }
        });
        return res.ok;
      }
      if (providerType === 'GOOGLE_GEMINI') {
        const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`);
        return res.ok;
      }
      
      // OpenAI-compatible
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  static async discoverModels(providerType: string, apiKey: string, customBaseUrl?: string | null): Promise<string[]> {
    const baseUrl = this.getBaseUrl(providerType, customBaseUrl).replace(/\/v1$/, '').replace(/\/v1beta$/, '');

    try {
      if (providerType === 'OLLAMA') {
        const res = await fetch(`${baseUrl}/api/tags`);
        if (!res.ok) throw new ProviderError('Ollama API error');
        const data = await res.json();
        return data.models?.map((m: any) => m.name) || [];
      }
      
      if (providerType === 'ANTHROPIC') {
        return [
          'claude-opus-4-5',
          'claude-sonnet-4-5',
          'claude-haiku-3-5',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      }

      if (providerType === 'GOOGLE_GEMINI') {
        const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`);
        if (!res.ok) throw new ProviderError('Gemini API error');
        const data = await res.json();
        return (data.models || []).map((m: any) => m.name as string).filter((name: string) => name.includes('gemini'));
      }
      
      if (providerType === 'DEEPSEEK') {
        return ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
      }
      
      if (providerType === 'FIREWORKS') {
        return [
          'accounts/fireworks/models/llama-v3p1-70b-instruct',
          'accounts/fireworks/models/mixtral-8x7b-instruct',
          'accounts/fireworks/models/qwen2p5-72b-instruct',
        ];
      }
      
      if (providerType === 'AZURE_OPENAI') {
        const res = await fetch(`${baseUrl}/openai/deployments?api-version=2024-02-01`, {
          headers: { 'api-key': apiKey }
        });
        if (!res.ok) throw new ProviderError('Azure API error');
        const data = await res.json();
        return (data.value || []).map((d: any) => d.id || d.model);
      }

      // OpenAI-compatible
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new ProviderError('Provider API error');
      const data = await res.json();
      return data.data?.map((m: any) => m.id) || [];
      
    } catch (e: any) {
      throw new ProviderError(`Discovery failed: ${e.message}`);
    }
  }
}
