import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { requestLogs, metrics, sseClients, redis } from '../server';
import { DynamicRouter, CircuitState } from '@enterprise/models';
import { buildRegistryForOrg, globalHealthMonitor, globalCircuitBreakers } from '../services/registry';
import { randomBytes, createHash } from 'crypto';

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
    const orgId = (request as any).user.organizationId;
    const registry = await buildRegistryForOrg(orgId);
    const dynamicRouter = new DynamicRouter(registry, globalHealthMonitor, globalCircuitBreakers);
    
    const allProviders = registry.getAllProviders().map(p => {
      const stats = dynamicRouter.getHealthMonitor().getStats(p.id);
      const breaker = dynamicRouter.getCircuitBreakers().getBreaker(p.id);
      return {
        id: p.id,
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
      user: req.userId || 'system',
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

  // --------------------------------------------------------
  // User Management
  // --------------------------------------------------------

  // GET /v1/admin/users - list users with pagination
  fastify.get('/v1/admin/users', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { page = '1', limit = '20', search } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { organizationId: orgId, deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { department: true },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { data: users, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // GET /v1/admin/users/:id - get user by ID
  fastify.get('/v1/admin/users/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const user = await prisma.user.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { department: true },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  // POST /v1/admin/users - create/invite user
  fastify.post('/v1/admin/users', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { email, firstName, lastName, role, departmentId } = request.body as any;

    if (!email) return reply.status(400).send({ error: 'Email required' });

    try {
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: 'pending',
          role: role || 'EMPLOYEE',
          isActive: true,
          organizationId: orgId,
          departmentId: departmentId || null,
        },
        include: { department: true },
      });
      return reply.status(201).send(user);
    } catch (e: any) {
      if (e.code === 'P2002') {
        return reply.status(409).send({ error: 'Email already exists' });
      }
      return reply.status(400).send({ error: e.message });
    }
  });

  // Keep legacy invite endpoint for backward compatibility
  fastify.post('/v1/admin/users/invite', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { email } = request.body as any;
    
    if (!email) return reply.status(400).send({ error: 'Email required' });
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'pending',
        role: 'EMPLOYEE',
        isActive: true,
        organizationId: orgId
      }
    });
    return user;
  });

  // PATCH /v1/admin/users/:id - update user role/dept/status
  fastify.patch('/v1/admin/users/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    const { role, departmentId, isActive, firstName, lastName } = request.body as any;

    const existing = await prisma.user.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
    if (!existing) return reply.status(404).send({ error: 'User not found' });

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    const user = await prisma.user.update({ where: { id }, data: updateData, include: { department: true } });
    return user;
  });

  // Keep legacy role-change endpoint
  fastify.patch('/v1/admin/users/:id/role', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as any;
    const { role } = request.body as any;
    
    const userCheck = await prisma.user.findUnique({ where: { id } });
    if (!userCheck || userCheck.organizationId !== orgId) {
      return reply.status(404).send({ error: 'User not found' });
    }
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return user;
  });

  // Keep legacy deactivate endpoint
  fastify.post('/v1/admin/users/:id/deactivate', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as any;
    
    const userCheck = await prisma.user.findUnique({ where: { id } });
    if (!userCheck || userCheck.organizationId !== orgId) {
      return reply.status(404).send({ error: 'User not found' });
    }
    const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
    return user;
  });

  // DELETE /v1/admin/users/:id - soft delete
  fastify.delete('/v1/admin/users/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const existing = await prisma.user.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return reply.status(404).send({ error: 'User not found' });

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  });

  // --------------------------------------------------------
  // Department Management
  // --------------------------------------------------------

  // GET /v1/admin/departments
  fastify.get('/v1/admin/departments', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const departments = await prisma.department.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    return departments;
  });

  // POST /v1/admin/departments
  fastify.post('/v1/admin/departments', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { name } = request.body as any;

    if (!name) return reply.status(400).send({ error: 'Name required' });

    try {
      const dept = await prisma.department.create({
        data: { name, organizationId: orgId },
      });
      return reply.status(201).send(dept);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // DELETE /v1/admin/departments/:id
  fastify.delete('/v1/admin/departments/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const dept = await prisma.department.findFirst({ where: { id, organizationId: orgId } });
    if (!dept) return reply.status(404).send({ error: 'Department not found' });

    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  });

  // --------------------------------------------------------
  // API Key Management
  // --------------------------------------------------------

  // GET /v1/admin/api-keys - list (masked)
  fastify.get('/v1/admin/api-keys', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Mask: show prefix + asterisks
    return keys.map(k => ({ ...k, maskedKey: `${k.keyPrefix}${'*'.repeat(36)}` }));
  });

  // POST /v1/admin/api-keys - create (return full key once)
  fastify.post('/v1/admin/api-keys', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { name, expiresAt } = request.body as any;

    if (!name) return reply.status(400).send({ error: 'Name required' });

    const rawKey = `gk_${randomBytes(24).toString('hex')}`;
    const prefix = rawKey.substring(0, 12);
    const hashedKey = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash: hashedKey,
        keyPrefix: prefix,
        organizationId: orgId,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return reply.status(201).send({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      rawKey, // Only returned once
      createdAt: apiKey.createdAt,
    });
  });

  // DELETE /v1/admin/api-keys/:id - revoke
  fastify.delete('/v1/admin/api-keys/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };

    const existing = await prisma.apiKey.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return reply.status(404).send({ error: 'API key not found' });

    await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  });

  // --------------------------------------------------------
  // Audit Logs
  // --------------------------------------------------------

  // GET /v1/admin/audit-logs - query with pagination
  fastify.get('/v1/admin/audit-logs', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { page = '1', limit = '50', userId, action, resource, from, to } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { organizationId: orgId };
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // --------------------------------------------------------
  // Providers (list + toggle – kept from original)
  // --------------------------------------------------------

  fastify.get('/v1/admin/providers', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    
    const dbConfigs = await prisma.providerConfig.findMany({
      where: { organizationId: orgId },
      include: { models: true }
    });
    
    const registry = await buildRegistryForOrg(orgId);
    const dynamicRouter = new DynamicRouter(registry, globalHealthMonitor, globalCircuitBreakers);

    const response = dbConfigs.map(dbConfig => {
      const isEnabled = dbConfig.isEnabled;
      const priority = dbConfig.priority;
      
      const stats = dynamicRouter.getHealthMonitor().getStats(dbConfig.name);
      const breaker = dynamicRouter.getCircuitBreakers().getBreaker(dbConfig.name);
      
      return {
        id: dbConfig.id,
        name: dbConfig.name,
        providerType: dbConfig.providerType,
        status: isEnabled ? 'active' : 'inactive',
        latency: stats.latencyMs,
        availability: stats.availability,
        successRate: 1 - stats.errorRate,
        errorRate: stats.errorRate,
        circuitBreakerState: breaker.getState(),
        currentLoad: 0,
        region: dbConfig.providerType === 'OLLAMA' ? 'local' : 'global',
        supportedModels: dbConfig.models.map(m => m.modelId),
        priority,
      };
    });
    
    return response;
  });

  // Update provider (patch by name slug - legacy)
  fastify.patch('/v1/admin/providers/:providerId', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { providerId } = request.params as { providerId: string };
    const { isEnabled, priority, weight } = request.body as any;

    const config = await prisma.providerConfig.upsert({
      where: { name_organizationId: { name: providerId, organizationId: orgId } },
      update: { isEnabled, priority },
      create: { 
        name: providerId, 
        providerType: 'CUSTOM',
        organizationId: orgId, 
        isEnabled: isEnabled ?? true, 
        priority: priority ?? 1 
      }
    });
    return config;
  });

  // --------------------------------------------------------
  // Request Logs
  // --------------------------------------------------------

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
      user: req.userId || 'system',
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

  // --------------------------------------------------------
  // Costs (real data from LogTrace)
  // --------------------------------------------------------

  fastify.get('/v1/admin/costs', async (request, reply) => {
    const orgId = (request as any).user.organizationId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.logTrace.findMany({
      where: { organizationId: orgId, timestamp: { gte: thirtyDaysAgo } },
      select: { timestamp: true, costUsd: true, providerId: true, isCacheHit: true }
    });

    const dailyMap = new Map<string, number>();
    const providerMap = new Map<string, number>();
    let cacheSavings = 0;

    for (const log of logs) {
      const date = log.timestamp.toISOString().substring(0, 10);
      dailyMap.set(date, (dailyMap.get(date) || 0) + (log.costUsd || 0));
      if (log.providerId) {
        providerMap.set(log.providerId, (providerMap.get(log.providerId) || 0) + (log.costUsd || 0));
      }
      if (log.isCacheHit) cacheSavings += (log.costUsd || 0);
    }

    const daily = Array.from(dailyMap.entries())
      .sort()
      .map(([date, cost]) => ({ date, cost }));

    const byProvider = Array.from(providerMap.entries())
      .map(([name, cost]) => ({ name, cost }));

    return {
      daily,
      byProvider,
      savings: { cache: cacheSavings, ollama: 0, routing: 0 }
    };
  });

  // --------------------------------------------------------
  // Cache Stats (real data)
  // --------------------------------------------------------

  fastify.get('/v1/admin/cache/stats', async (request, reply) => {
    const orgId = (request as any).user.organizationId;

    let cacheSize = 0;
    try {
      if (redis) {
        const info = await redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) cacheSize = parseInt(match[1]);
      }
    } catch {}

    const hitRatio = metrics.totalRequests > 0 ? metrics.cacheHits / metrics.totalRequests : 0;

    const cachedLogs = await prisma.logTrace.findMany({
      where: { organizationId: orgId, isCacheHit: true },
      select: { prompt: true },
      take: 10
    });

    const promptCounts = new Map<string, number>();
    for (const log of cachedLogs) {
      const key = log.prompt.substring(0, 50);
      promptCounts.set(key, (promptCounts.get(key) || 0) + 1);
    }

    const topPrompts = Array.from(promptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([prompt, hits]) => ({ prompt, hits }));

    return {
      cacheSize,
      hitRatio,
      missRatio: 1 - hitRatio,
      ttl: 3600,
      evictions: 0,
      totalHits: metrics.cacheHits,
      totalRequests: metrics.totalRequests,
      topPrompts
    };
  });

  // --------------------------------------------------------
  // Security Events
  // --------------------------------------------------------

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

  // --------------------------------------------------------
  // Policies
  // --------------------------------------------------------

  fastify.get('/v1/admin/policies', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const policies = await prisma.policy.findMany({
      where: { organizationId: orgId },
      orderBy: { priority: 'asc' }
    });
    return policies;
  });

  fastify.post('/v1/admin/policies', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { name, priority, conditionLogic, actionLogic, isEnabled } = request.body as any;
    
    const policy = await prisma.policy.create({
      data: {
        name: name || 'New Policy',
        organizationId: orgId,
        priority: priority || 1,
        conditionLogic: conditionLogic || {},
        actionLogic: actionLogic || {},
        isEnabled: isEnabled !== false
      }
    });
    return policy;
  });

  fastify.patch('/v1/admin/policies/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    const updates = request.body as any;
    
    const existing = await prisma.policy.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!existing) return reply.status(404).send({ error: 'Policy not found' });
    
    const policy = await prisma.policy.update({
      where: { id },
      data: updates
    });
    return policy;
  });

  fastify.delete('/v1/admin/policies/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    
    const existing = await prisma.policy.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!existing) return reply.status(404).send({ error: 'Policy not found' });
    
    await prisma.policy.delete({ where: { id } });
    return { success: true };
  });

  // --------------------------------------------------------
  // Organizations
  // --------------------------------------------------------

  fastify.get('/v1/admin/orgs', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    return [org];
  });

  fastify.put('/v1/admin/orgs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, plan } = request.body as any;
    if (id !== (request as any).user.organizationId) {
      return reply.status(403).send({ error: 'Cannot update other organizations' });
    }
    const org = await prisma.organization.update({ where: { id }, data: { name } });
    return org;
  });

  // --------------------------------------------------------
  // Routing Config
  // --------------------------------------------------------

  fastify.get('/v1/admin/routing/config', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    return { strategy: org?.routingStrategy || 'balanced' };
  });

  fastify.put('/v1/admin/routing/config', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { strategy } = request.body as any;
    
    await prisma.organization.update({
      where: { id: orgId },
      data: { routingStrategy: strategy }
    });
    
    return { strategy };
  });

  // --------------------------------------------------------
  // Budgets
  // --------------------------------------------------------

  fastify.get('/v1/admin/budget', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    let budget = await prisma.budget.findUnique({
      where: { organizationId: orgId }
    });
    if (!budget) {
      budget = await prisma.budget.create({
        data: { organizationId: orgId, monthlyLimitUsd: 1000, alertThresholdPercent: 80, currentSpendUsd: 0 }
      });
    }
    return budget;
  });

  fastify.put('/v1/admin/budget', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { monthlyLimitUsd, alertThresholdPercent } = request.body as any;
    
    const budget = await prisma.budget.upsert({
      where: { organizationId: orgId },
      update: { monthlyLimitUsd: Number(monthlyLimitUsd), alertThresholdPercent: Number(alertThresholdPercent) },
      create: { organizationId: orgId, monthlyLimitUsd: Number(monthlyLimitUsd), alertThresholdPercent: Number(alertThresholdPercent), currentSpendUsd: 0 }
    });
    return budget;
  });

  // --------------------------------------------------------
  // Prompt Templates
  // --------------------------------------------------------

  fastify.get('/v1/admin/prompt-templates', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const templates = await prisma.promptTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    return templates;
  });

  fastify.post('/v1/admin/prompt-templates', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { name, description, content, isGlobal } = request.body as any;
    if (!name || !content) {
      return reply.status(400).send({ error: 'Name and content are required' });
    }
    const template = await prisma.promptTemplate.create({
      data: { organizationId: orgId, name, description, content, isGlobal: isGlobal || false }
    });
    return template;
  });

  fastify.patch('/v1/admin/prompt-templates/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    const { name, description, content, isGlobal } = request.body as any;
    
    const existing = await prisma.promptTemplate.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!existing) return reply.status(404).send({ error: 'Prompt template not found' });
    
    const template = await prisma.promptTemplate.update({
      where: { id },
      data: { name, description, content, isGlobal }
    });
    return template;
  });

  fastify.delete('/v1/admin/prompt-templates/:id', async (request, reply) => {
    const orgId = (request as any).user.organizationId;
    const { id } = request.params as { id: string };
    
    const existing = await prisma.promptTemplate.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!existing) return reply.status(404).send({ error: 'Prompt template not found' });

    await prisma.promptTemplate.delete({
      where: { id }
    });
    return { success: true };
  });

  // --------------------------------------------------------
  // SSE live telemetry
  // --------------------------------------------------------

  fastify.get('/v1/admin/events', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    
    sseClients.add(reply);
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

    request.raw.on('close', () => {
      sseClients.delete(reply);
    });
  });

  // --------------------------------------------------------
  // Hardware discovery
  // --------------------------------------------------------

  fastify.get('/v1/admin/hardware', async (request, reply) => {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    
    let ollamaStatus = 'Disconnected';
    let latency = 0;
    let version = 'N/A';
    let installedModels: any[] = [];
    
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      const start = Date.now();
      const [tagsRes, verRes] = await Promise.all([
        fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal }),
        fetch(`${ollamaUrl}/api/version`, { signal: controller.signal })
      ]);
      latency = Date.now() - start;
      clearTimeout(timeout);
      
      if (tagsRes.ok && verRes.ok) {
        ollamaStatus = 'Connected';
        const tagsData = await tagsRes.json();
        const verData = await verRes.json();
        
        version = verData.version;
        installedModels = tagsData.models?.map((m: any) => ({
          name: m.name,
          sizeGb: (m.size / (1024 ** 3)).toFixed(2),
          parameterSize: m.details?.parameter_size,
          quantization: m.details?.quantization_level
        })) || [];
      }
    } catch (err) {
      // disconnected
    }

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: cpus.length,
      cpuModel: cpus[0]?.model,
      totalMemoryGb: (totalMem / (1024 ** 3)).toFixed(2),
      freeMemoryGb: (freeMem / (1024 ** 3)).toFixed(2),
      memoryUsagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
      estimatedVram: "N/A",
      ollama: {
        status: ollamaStatus,
        url: ollamaUrl,
        latencyMs: latency,
        version,
        models: installedModels
      }
    };
  });
}
