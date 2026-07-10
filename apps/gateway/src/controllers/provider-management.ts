import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { encrypt, ProviderFactory } from '@enterprise/models';

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
      const isSuccess = await ProviderFactory.testConnection(providerType, apiKey || '', baseUrl);
      if (!isSuccess) {
        return reply.status(400).send({ success: false, error: 'Connection failed or invalid API key' });
      }
      return { success: true, message: 'Connection successful' };
    } catch (e: any) {
      return reply.status(400).send({ success: false, error: e.message });
    }
  });

  // --------------------------------------------------------
  // Discover models from a provider
  // --------------------------------------------------------
  fastify.post('/v1/admin/providers/discover', async (request, reply) => {
    const { providerType, baseUrl, apiKey } = request.body as any;
    
    try {
      const models = await ProviderFactory.discoverModels(providerType, apiKey || '', baseUrl);
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
