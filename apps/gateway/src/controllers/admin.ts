import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { requestLogs, metrics, sseClients } from '../server';
import { DynamicRouter, CircuitState } from '@enterprise/models';

export default async function adminRoutes(fastify: FastifyInstance) {
  // All routes here require authentication and ADMIN role
  fastify.addHook('preValidation', (fastify as any).authenticate);
  
  // Custom hook for role checking
  fastify.addHook('preHandler', async (request, reply) => {
    const userRole = (request as any).user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  });

  fastify.get('/v1/admin/dashboard', async (request, reply) => {
    // This will eventually read from PG for persistent stats, but for now
    // we mix live metrics with persistent DB counts
    const totalUsers = await prisma.user.count();
    const totalConvos = await prisma.conversation.count();
    const totalLogs = await prisma.logTrace.count();
    
    // Read live state from dynamic router
    const dynamicRouter = new DynamicRouter();
    
    const allProviders = ['openai', 'bedrock', 'ollama'].map(id => {
      const stats = dynamicRouter.getHealthMonitor().getStats(id);
      const breaker = dynamicRouter.getCircuitBreakers().getBreaker(id);
      return {
        id,
        availability: stats.availability,
        latency: stats.latencyMs,
        errorRate: stats.errorRate,
        circuitState: breaker.getState(),
      };
    });

    // Compute costs from persistent DB
    const agg = await prisma.providerMetric.aggregate({
      _sum: { costUsd: true, tokensUsed: true }
    });

    const recentLogs = await prisma.logTrace.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    const mappedRecent = recentLogs.map(req => ({
      id: req.id,
      timestamp: req.timestamp.toISOString(),
      userId: req.userId || 'system',
      department: 'Engineering',
      prompt: req.prompt,
      providerId: req.providerId,
      modelId: req.modelId,
      routingStrategy: req.routingStrategy,
      latencyMs: req.latencyMs,
      costUsd: req.costUsd || 0,
      tokens: req.tokens || 0,
      cacheHit: req.isCacheHit,
      piiDetected: req.piiDetected,
      injectionDetected: req.injectionDetected,
      status: req.status.toLowerCase(),
      errorMessage: req.errorMessage,
    }));
    
    return {
      totalRequests: totalLogs + metrics.totalRequests,
      todayRequests: totalLogs,
      averageLatency: 45, // mock or calculate average
      cacheHitRatio: metrics.totalRequests > 0 ? metrics.cacheHits / metrics.totalRequests : 0,
      todayCostUsd: (agg._sum.costUsd || 0) + metrics.totalCostUsd,
      monthlyCostUsd: (agg._sum.costUsd || 0) + metrics.totalCostUsd,
      blockedPrompts: metrics.blockedPrompts,
      detectedPii: metrics.detectedPii,
      circuitBreakerEvents: metrics.circuitBreakerEvents,
      errorRate: metrics.totalRequests > 0 ? metrics.errorCount / metrics.totalRequests : 0,
      activeUsers: totalUsers,
      totalConversations: totalConvos,
      providers: allProviders,
      recentRequests: mappedRecent,
    };
  });

  fastify.get('/v1/admin/users', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      include: { department: true }
    });
    return users;
  });

  fastify.get('/v1/admin/providers', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    
    // Default configs if not in DB
    const defaultProviders = [
      { id: 'openai', region: 'us-east-1', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'] },
      { id: 'bedrock', region: 'us-west-2', models: ['anthropic.claude-3-sonnet'] },
      { id: 'ollama', region: 'local', models: ['llama3.2', 'mistral'] },
    ];
    
    const dbConfigs = await prisma.providerConfig.findMany({
      where: { organizationId: orgId }
    });
    
    const configMap = new Map(dbConfigs.map(c => [c.providerId, c]));
    
    const dynamicRouter = new DynamicRouter();

    const response = defaultProviders.map(dp => {
      const dbConfig = configMap.get(dp.id);
      const isEnabled = dbConfig ? dbConfig.isEnabled : true;
      const priority = dbConfig ? dbConfig.priority : 1;
      
      const stats = dynamicRouter.getHealthMonitor().getStats(dp.id);
      const breaker = dynamicRouter.getCircuitBreakers().getBreaker(dp.id);
      
      return {
        id: dp.id,
        status: isEnabled ? 'active' : 'inactive',
        latency: stats.latencyMs,
        availability: stats.availability,
        successRate: 1 - stats.errorRate,
        errorRate: stats.errorRate,
        circuitBreakerState: breaker.getState(),
        currentLoad: 0,
        region: dp.region,
        supportedModels: dp.models,
        priority
      };
    });
    
    return response;
  });

  // Update provider
  fastify.patch('/v1/admin/providers/:providerId', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { providerId } = request.params as { providerId: string };
    const { isEnabled, priority, weight } = request.body as any;

    const config = await prisma.providerConfig.upsert({
      where: { providerId_organizationId: { providerId, organizationId: orgId } },
      update: { isEnabled, priority, weight },
      create: { providerId, organizationId: orgId, isEnabled, priority, weight }
    });
    return config;
  });

  fastify.get('/v1/admin/requests', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const recentLogs = await prisma.logTrace.findMany({
      where: { organizationId: orgId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return recentLogs.map(req => ({
      id: req.id,
      timestamp: req.timestamp.toISOString(),
      userId: req.userId || 'system',
      department: 'Engineering',
      prompt: req.prompt,
      providerId: req.providerId,
      modelId: req.modelId,
      routingStrategy: req.routingStrategy,
      latencyMs: req.latencyMs,
      costUsd: req.costUsd || 0,
      tokens: req.tokens || 0,
      cacheHit: req.isCacheHit,
      piiDetected: req.piiDetected,
      injectionDetected: req.injectionDetected,
      status: req.status.toLowerCase(),
      errorMessage: req.errorMessage,
    }));
  });

  fastify.get('/v1/admin/costs', async (request, reply) => {
    return {
      daily: [
        { date: 'Mon', cost: 1.2 }, { date: 'Tue', cost: 2.3 }, 
        { date: 'Wed', cost: 1.5 }, { date: 'Thu', cost: 0.8 }, { date: 'Fri', cost: Math.random() * 2 }
      ],
      byProvider: [
        { name: 'OpenAI', cost: 3.4 },
        { name: 'Bedrock', cost: 1.2 },
        { name: 'Ollama', cost: 0 }
      ],
      savings: { cache: 0.45, ollama: 2.30, routing: 1.10 }
    };
  });

  fastify.get('/v1/admin/cache/stats', async (request, reply) => {
    return {
      cacheSize: 1024 * 1024 * 5, // 5MB
      hitRatio: metrics.totalRequests > 0 ? metrics.cacheHits / metrics.totalRequests : 0,
      missRatio: metrics.totalRequests > 0 ? (metrics.totalRequests - metrics.cacheHits) / metrics.totalRequests : 1,
      ttl: 3600,
      evictions: 12,
      topPrompts: [
        { prompt: 'Summarize the document', hits: 42 },
        { prompt: 'Explain this code', hits: 28 }
      ]
    };
  });

  fastify.get('/v1/admin/security/events', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const events = await prisma.logTrace.findMany({
      where: { 
        organizationId: orgId,
        OR: [ { piiDetected: true }, { injectionDetected: true } ]
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    return events.map(e => ({
      timestamp: e.timestamp.toISOString(),
      userId: e.userId || 'system',
      type: e.piiDetected ? 'PII_LEAK' : 'PROMPT_INJECTION',
      details: e.errorMessage || 'Policy violation detected',
      status: 'BLOCKED'
    }));
  });

  // SSE endpoint for live admin telemetry
  fastify.get('/v1/admin/events', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    
    // Add client
    sseClients.add(reply);

    // Initial message
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

    request.raw.on('close', () => {
      sseClients.delete(reply);
    });
  });

  // Hardware discovery API for Ollama / local deployment
  fastify.get('/v1/admin/hardware', async (request, reply) => {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: cpus.length,
      cpuModel: cpus[0]?.model,
      totalMemoryGb: (totalMem / (1024 ** 3)).toFixed(2),
      freeMemoryGb: (freeMem / (1024 ** 3)).toFixed(2),
      memoryUsagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
      estimatedVram: "N/A", // In a real production setup, we would query nvidia-smi or similar
      status: 'healthy'
    };
  });
}
