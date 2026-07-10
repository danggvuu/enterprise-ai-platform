import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { encrypt } from '@enterprise/models';

export default async function providerManagementRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', (fastify as any).authenticate);
  fastify.addHook('preHandler', async (request, reply) => {
    const userRole = (request as any).user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  });

  // --------------------------------------------------------
  // Test connection to a provider
  // --------------------------------------------------------
  fastify.post('/v1/admin/providers/test', async (request, reply) => {
    const { providerType, baseUrl, apiKey } = request.body as any;
    
    try {
      if (providerType === 'OLLAMA') {
        const url = baseUrl || 'http://127.0.0.1:11434';
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
        return { success: true, message: 'Connection successful' };
      }
      
      if (providerType === 'AZURE_OPENAI') {
        if (!baseUrl) throw new Error('AZURE_OPENAI requires a baseUrl');
        const res = await fetch(`${baseUrl}/openai/deployments?api-version=2024-02-01`, {
          headers: { 'api-key': apiKey }
        });
        if (!res.ok) throw new Error(`Azure returned status ${res.status}`);
        return { success: true, message: 'Connection successful' };
      }

      if (providerType === 'GOOGLE_GEMINI') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!res.ok) throw new Error(`Google Gemini returned status ${res.status}`);
        return { success: true, message: 'Connection successful' };
      }

      // OpenAI-compatible providers
      const openaiCompatible = [
        'OPENAI', 'CUSTOM', 'ANTHROPIC', 'OPENROUTER', 'GROQ',
        'TOGETHER', 'FIREWORKS', 'MISTRAL', 'DEEPSEEK', 'LM_STUDIO', 'VLLM', 'LOCAL_AI'
      ];
      if (openaiCompatible.includes(providerType)) {
        const defaultUrls: Record<string, string> = {
          OPENAI: 'https://api.openai.com',
          ANTHROPIC: 'https://api.anthropic.com',
          OPENROUTER: 'https://openrouter.ai/api',
          GROQ: 'https://api.groq.com/openai',
          TOGETHER: 'https://api.together.xyz',
          FIREWORKS: 'https://api.fireworks.ai/inference',
          MISTRAL: 'https://api.mistral.ai',
          DEEPSEEK: 'https://api.deepseek.com',
          LM_STUDIO: 'http://localhost:1234',
          VLLM: 'http://localhost:8000',
          LOCAL_AI: 'http://localhost:8080',
          CUSTOM: 'https://api.openai.com',
        };
        const resolvedBase = (baseUrl || defaultUrls[providerType] || 'https://api.openai.com').replace(/\/v1$/, '');
        const res = await fetch(`${resolvedBase}/v1/models`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`Provider returned status ${res.status}`);
        return { success: true, message: 'Connection successful' };
      }

      return reply.status(400).send({ error: `Testing for ${providerType} not implemented yet` });
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Discover models from a provider
  // --------------------------------------------------------
  fastify.post('/v1/admin/providers/discover', async (request, reply) => {
    const { providerType, baseUrl, apiKey } = request.body as any;
    let models: string[] = [];
    
    try {
      if (providerType === 'OLLAMA') {
        const url = baseUrl || 'http://127.0.0.1:11434';
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
        const data = await res.json();
        models = data.models?.map((m: any) => m.name) || [];

      } else if (providerType === 'ANTHROPIC') {
        models = [
          'claude-opus-4-5',
          'claude-sonnet-4-5',
          'claude-haiku-3-5',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];

      } else if (providerType === 'GOOGLE_GEMINI') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!res.ok) throw new Error(`Google Gemini returned status ${res.status}`);
        const data = await res.json();
        models = (data.models || [])
          .map((m: any) => m.name as string)
          .filter((name: string) => name.includes('gemini'));

      } else if (providerType === 'DEEPSEEK') {
        models = ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];

      } else if (providerType === 'FIREWORKS') {
        models = [
          'accounts/fireworks/models/llama-v3p1-70b-instruct',
          'accounts/fireworks/models/mixtral-8x7b-instruct',
          'accounts/fireworks/models/qwen2p5-72b-instruct',
        ];

      } else if (providerType === 'AZURE_OPENAI') {
        if (!baseUrl) throw new Error('AZURE_OPENAI requires a baseUrl');
        const res = await fetch(`${baseUrl}/openai/deployments?api-version=2024-02-01`, {
          headers: { 'api-key': apiKey }
        });
        if (!res.ok) throw new Error(`Azure returned status ${res.status}`);
        const data = await res.json();
        models = (data.value || []).map((d: any) => d.id || d.model);

      } else {
        // OpenAI-compatible: OPENAI, CUSTOM, OPENROUTER, GROQ, TOGETHER, MISTRAL, LM_STUDIO, VLLM, LOCAL_AI
        const defaultUrls: Record<string, string> = {
          OPENAI: 'https://api.openai.com/v1',
          CUSTOM: baseUrl || 'https://api.openai.com/v1',
          OPENROUTER: 'https://openrouter.ai/api/v1',
          GROQ: 'https://api.groq.com/openai/v1',
          TOGETHER: 'https://api.together.xyz/v1',
          MISTRAL: 'https://api.mistral.ai/v1',
          LM_STUDIO: 'http://localhost:1234/v1',
          VLLM: 'http://localhost:8000/v1',
          LOCAL_AI: 'http://localhost:8080/v1',
        };
        const url = baseUrl || defaultUrls[providerType] || 'https://api.openai.com/v1';
        const res = await fetch(`${url}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`Provider returned status ${res.status}`);
        const data = await res.json();
        models = data.data?.map((m: any) => m.id) || [];
      }
      
      return { success: true, models };
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Create provider
  // --------------------------------------------------------
  fastify.post('/v1/admin/providers', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { name, providerType, baseUrl, apiKey, models } = request.body as any;

    try {
      const encryptedKey = apiKey ? encrypt(apiKey) : null;

      const provider = await prisma.providerConfig.create({
        data: {
          name,
          providerType,
          organizationId: orgId,
          baseUrl,
          encryptedApiKey: encryptedKey,
          isEnabled: true,
          priority: 1,
          weight: 1.0,
          models: {
            create: (models || []).map((m: any) => ({
              modelId: m.modelId,
              displayName: m.displayName,
              description: m.description,
              contextWindow: m.contextWindow || 8192,
              promptCostPer1k: m.promptCostPer1k || 0,
              completionCostPer1k: m.completionCostPer1k || 0,
              supportsVision: m.supportsVision || false,
              supportsStreaming: m.supportsStreaming !== false,
              supportsToolCalling: m.supportsToolCalling || false,
            }))
          }
        },
        include: { models: true }
      });

      return provider;
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Get single provider by ID (with models)
  // --------------------------------------------------------
  fastify.get('/v1/admin/providers/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const provider = await prisma.providerConfig.findFirst({
      where: { id, organizationId: orgId },
      include: { models: true }
    });

    if (!provider) return reply.status(404).send({ error: 'Provider not found' });
    return provider;
  });

  // --------------------------------------------------------
  // Update provider by ID
  // --------------------------------------------------------
  fastify.put('/v1/admin/providers/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    const { name, baseUrl, apiKey, isEnabled, priority } = request.body as any;

    try {
      const existing = await prisma.providerConfig.findFirst({
        where: { id, organizationId: orgId }
      });
      if (!existing) return reply.status(404).send({ error: 'Provider not found' });

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
      if (priority !== undefined) updateData.priority = priority;
      if (apiKey) updateData.encryptedApiKey = encrypt(apiKey);

      const updated = await prisma.providerConfig.update({
        where: { id },
        data: updateData,
        include: { models: true }
      });
      return updated;
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Delete provider by ID
  // --------------------------------------------------------
  fastify.delete('/v1/admin/providers/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    try {
      const provider = await prisma.providerConfig.findFirst({
        where: { id, organizationId: orgId }
      });

      if (!provider) {
        return reply.status(404).send({ error: 'Provider not found' });
      }

      await prisma.aIModel.deleteMany({ where: { providerId: provider.id } });
      await prisma.providerConfig.delete({ where: { id: provider.id } });

      return { success: true };
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // List models for a provider
  // --------------------------------------------------------
  fastify.get('/v1/admin/providers/:id/models', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const provider = await prisma.providerConfig.findFirst({
      where: { id, organizationId: orgId },
      include: { models: true }
    });

    if (!provider) return reply.status(404).send({ error: 'Provider not found' });
    return provider.models;
  });

  // --------------------------------------------------------
  // Add a model to a provider
  // --------------------------------------------------------
  fastify.post('/v1/admin/providers/:id/models', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    const {
      modelId, displayName, description,
      contextWindow, promptCostPer1k, completionCostPer1k,
      supportsVision, supportsStreaming, supportsToolCalling,
      supportsEmbeddings, supportsJsonMode, supportsReasoning,
    } = request.body as any;

    try {
      const provider = await prisma.providerConfig.findFirst({
        where: { id, organizationId: orgId }
      });
      if (!provider) return reply.status(404).send({ error: 'Provider not found' });

      const model = await prisma.aIModel.create({
        data: {
          providerId: id,
          modelId,
          displayName,
          description,
          contextWindow: contextWindow || 8192,
          promptCostPer1k: promptCostPer1k || 0,
          completionCostPer1k: completionCostPer1k || 0,
          supportsVision: supportsVision || false,
          supportsStreaming: supportsStreaming !== false,
          supportsToolCalling: supportsToolCalling || false,
          supportsEmbeddings: supportsEmbeddings || false,
          supportsJsonMode: supportsJsonMode || false,
          supportsReasoning: supportsReasoning || false,
        }
      });
      return model;
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Remove a model from a provider
  // --------------------------------------------------------
  fastify.delete('/v1/admin/providers/:id/models/:modelId', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id, modelId } = request.params as { id: string; modelId: string };

    try {
      const provider = await prisma.providerConfig.findFirst({
        where: { id, organizationId: orgId }
      });
      if (!provider) return reply.status(404).send({ error: 'Provider not found' });

      await prisma.aIModel.delete({
        where: { id: modelId }
      });
      return { success: true };
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });
}
