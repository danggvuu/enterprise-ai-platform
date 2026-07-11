import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { ModelFactory, ChatRequest, DynamicRouter, RetryEngine, CircuitState, decrypt } from '@enterprise/models';
import { buildRegistryForOrg, globalHealthMonitor, globalCircuitBreakers } from '../services/registry';
import { SafetyScanner } from '@enterprise/safety';
import { SemanticCache } from '@enterprise/cache';
import { CostTracker } from '@enterprise/finops';
import { ProviderTimeoutError, DatabaseUnavailableError } from '@enterprise/errors';
import { requestLogs, metrics, sseClients, publishSSE, currentGlobalStrategy, redis } from '../server';

const pendingDbWrites: Array<() => Promise<void>> = [];
setInterval(async () => {
  if (pendingDbWrites.length > 0) {
    const task = pendingDbWrites.shift();
    if (task) {
      try { await task(); } catch (e) { pendingDbWrites.push(task); }
    }
  }
}, 5000);

async function safeDbWrite(task: () => Promise<void>) {
  try {
    await task();
  } catch (err) {
    console.warn('[DB Fallback] Database write failed, queueing for later', (err as Error).message);
    pendingDbWrites.push(task);
  }
}

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', (fastify as any).authenticate);

  fastify.post('/v1/chat/completions', async (request, reply) => {
    const payload = request.body as ChatRequest & { conversationId?: string };
    if (!payload || !payload.model || !payload.messages) {
      return reply.status(400).send({ error: 'Invalid request payload' });
    }

    const userId = (request as any).user.id;
    const orgId = (request as any).user.organizationId;
    metrics.activeUsers.add(userId);

    let conversationId = payload.conversationId;
    
    safeDbWrite(async () => {
      if (!conversationId) {
        const conv = await prisma.conversation.create({
          data: { title: payload.messages[0]?.content.substring(0, 50) || 'New Chat', userId }
        });
        conversationId = conv.id;
      }
      const userMessage = payload.messages[payload.messages.length - 1];
      await prisma.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: userMessage.content,
          sequenceNumber: payload.messages.length
        }
      });
    });

    const userMessage = payload.messages[payload.messages.length - 1];
    let piiDetected = false;
    let injectionDetected = false;
    
    const scanner = new SafetyScanner();
    let safeMessages = [];
    try {
      safeMessages = payload.messages.map(msg => {
        if (msg.role === 'user') {
          if (msg.content.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g) || msg.content.match(/\b([0-9]{12})\b/g) || msg.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
            piiDetected = true;
            metrics.detectedPii++;
          }
          const { text } = scanner.scanInput(msg.content);
          return { ...msg, content: text };
        }
        return msg;
      });
    } catch (err: any) {
      injectionDetected = true;
      metrics.blockedPrompts++;
      metrics.errorCount++;
      
      safeDbWrite(async () => {
        const failedLog = await prisma.logTrace.create({
          data: {
            traceId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            userId, organizationId: orgId, prompt: userMessage.content, routingStrategy: 'balanced',
            latencyMs: 0, costUsd: 0, tokens: 0, isCacheHit: false, piiDetected, injectionDetected, status: 'BLOCKED', errorMessage: err.message
          }
        });
        publishSSE('request', failedLog);
      });
      
      throw err;
    }

    const registry = await buildRegistryForOrg(orgId);
    const dynamicRouter = new DynamicRouter(registry, globalHealthMonitor, globalCircuitBreakers);
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    let strategy = (request.headers['x-routing-strategy'] as any) || org?.routingStrategy || 'balanced';
    
    // Inject strong system prompt if missing to prevent Llama 3.2 hallucinations
    if (!safeMessages.some(m => m.role === 'system')) {
      safeMessages.unshift({
        role: 'system',
        content: 'You are a highly intelligent, professional Enterprise AI Assistant. You MUST ALWAYS respond in natural, fluent Vietnamese regardless of the language of the prompt unless explicitly asked to speak another language. Do not hallucinate facts. If you do not know something, say so.'
      });
    }
    
    // Evaluate Policies
    const policies = await prisma.policy.findMany({ 
      where: { organizationId: orgId, isEnabled: true },
      orderBy: { priority: 'asc' } 
    });

    for (const policy of policies) {
      const cond = policy.conditionLogic as any;
      const act = policy.actionLogic as any;
      let matched = false;
      if (cond.field === 'Contains PII' && cond.value === 'true' && piiDetected) {
        matched = true;
      }
      if (matched) {
        if (act.actionField === 'Reject Request') {
          throw new Error(`Blocked by policy: ${policy.name}`);
        }
        if (act.actionField === 'Force Provider Limit') {
           strategy = 'cost-optimized'; // Enforce local model
        }
        if (act.actionField === 'Force Compliance Tag') {
           safeMessages.unshift({ role: 'system', content: `[COMPLIANCE RULE ENFORCED]: ${act.actionValue}` });
        }
      }
    }
    
    const adapterRequest = { ...payload, messages: safeMessages };

    let cachedResponse = null;
    let semanticCache: any = null;

    if (process.env.NODE_ENV !== 'test') {
      semanticCache = new SemanticCache(redis);
      cachedResponse = await semanticCache.get(adapterRequest);
    }
    
    metrics.totalRequests++;

    if (cachedResponse) {
      metrics.cacheHits++;
      const responseContent = cachedResponse.choices?.[0]?.message?.content || '';
      
      safeDbWrite(async () => {
        const successLog = await prisma.logTrace.create({
          data: {
            traceId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            userId, organizationId: orgId, prompt: userMessage.content, providerId: 'cache', modelId: payload.model, routingStrategy: strategy,
            latencyMs: 5, costUsd: 0, tokens: 0, isCacheHit: true, piiDetected, injectionDetected, status: 'SUCCESS', responseText: responseContent
          }
        });
        
        if (conversationId) {
          await prisma.message.create({
            data: {
              conversationId,
              role: 'ASSISTANT',
              content: responseContent,
              sequenceNumber: payload.messages.length + 1,
              providerId: 'cache',
              modelId: payload.model,
              latencyMs: 5,
              costUsd: 0,
              isCacheHit: true,
              routingReason: strategy
            }
          });
        }
        
        publishSSE('request', successLog);
      });

      return { ...cachedResponse, conversationId };
    }

    let response: any;
    let finalDecision: any;
    let latency = 0;
    let tokens = 0;
    let cost = 0;
    let success = false;
    let lastError: any;

    const maxFailovers = 3;
    for (let attempt = 0; attempt < maxFailovers; attempt++) {
      const decision = dynamicRouter.route({
        model: payload.model,
        strategy,
      }, { containsPII: piiDetected });
      
      finalDecision = decision;
      adapterRequest.model = decision.modelId;

      // Ollama preflight
      if (decision.providerId === 'ollama') {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
          await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
          clearTimeout(timeout);
        } catch (err) {
          dynamicRouter.getHealthMonitor().recordFailure(decision.providerId);
          dynamicRouter.getCircuitBreakers().getBreaker(decision.providerId).recordFailure();
          lastError = new Error('Ollama offline');
          continue; 
        }
      }

      const retryEngine = new RetryEngine(1, 200); // 1 retry per provider since we failover
      const isFallback = decision.providerId === 'ollama' || decision.providerId === 'openai';
      const dbProvider = isFallback ? null : await prisma.providerConfig.findUnique({
        where: { name_organizationId: { name: decision.providerId, organizationId: orgId } }
      });
      const decryptedKey = dbProvider?.encryptedApiKey ? decrypt(dbProvider.encryptedApiKey) : undefined;
      const providerType = isFallback ? (decision.providerId === 'ollama' ? 'OLLAMA' : 'OPENAI') : (dbProvider?.providerType || 'OPENAI');

      const adapter = ModelFactory.createAdapter(providerType, {
        apiKey: decryptedKey || process.env.OPENAI_API_KEY, // Fallback to env for local dev if missing
        region: process.env.AWS_REGION || 'us-east-1',
        baseUrl: dbProvider?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      });
      
      const startTime = Date.now();
      try {
        const timeoutPromise = new Promise<any>((_, reject) => 
           setTimeout(() => reject(new Error('Provider timeout')), 25000)
        );
        response = await retryEngine.execute(async () => {
          return await Promise.race([adapter.chat(adapterRequest), timeoutPromise]);
        });
        
        latency = Date.now() - startTime;
        dynamicRouter.getHealthMonitor().recordSuccess(decision.providerId, latency);
        dynamicRouter.getCircuitBreakers().getBreaker(decision.providerId).recordSuccess();
        success = true;
        break; 
      } catch (err: any) {
        dynamicRouter.getHealthMonitor().recordFailure(decision.providerId);
        const breaker = dynamicRouter.getCircuitBreakers().getBreaker(decision.providerId);
        breaker.recordFailure();
        lastError = err;
        
        if (breaker.getState() === CircuitState.OPEN) {
          metrics.circuitBreakerEvents++;
          publishSSE('circuit_breaker', { providerId: decision.providerId, state: 'OPEN' });
        }
      }
    }

    if (!success) {
      metrics.errorCount++;
      safeDbWrite(async () => {
        const failedLog = await prisma.logTrace.create({
          data: {
            traceId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            userId, organizationId: orgId, prompt: userMessage.content, providerId: finalDecision?.providerId, modelId: finalDecision?.modelId, routingStrategy: strategy,
            latencyMs: latency, costUsd: 0, tokens: 0, isCacheHit: false, piiDetected, injectionDetected, status: 'ERROR', errorMessage: lastError?.message || 'Failover exhausted'
          }
        });
        publishSSE('request', failedLog);
      });
      throw new ProviderTimeoutError(lastError?.message || 'All providers failed');
    }

    if (response && response.usage) {
      metrics.totalTokens += response.usage.total_tokens;
      tokens = response.usage.total_tokens;
      const tracker = new CostTracker();
      const costData = tracker.calculateCost(payload.model, response.usage);
      metrics.totalCostUsd += costData.total_cost_usd;
      cost = costData.total_cost_usd;
    }
    
    if (response && response.choices) {
      response.choices = response.choices.map((choice: any) => {
        if (choice.message && choice.message.content) {
          const { text } = scanner.scanOutput(choice.message.content);
          return { ...choice, message: { ...choice.message, content: text } };
        }
        return choice;
      });
    }

    const responseContent = response.choices?.[0]?.message?.content || '';

    safeDbWrite(async () => {
      const successLog = await prisma.logTrace.create({
        data: {
          traceId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          userId, organizationId: orgId, prompt: userMessage.content, providerId: finalDecision.providerId, modelId: finalDecision.modelId, routingStrategy: strategy,
          latencyMs: latency, costUsd: cost, tokens, isCacheHit: false, piiDetected, injectionDetected, status: 'SUCCESS', responseText: responseContent
        }
      });
      
      if (conversationId) {
        await prisma.message.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: responseContent,
            sequenceNumber: payload.messages.length + 1,
            providerId: finalDecision.providerId,
            modelId: finalDecision.modelId,
            latencyMs: latency,
            costUsd: cost,
            isCacheHit: false,
            routingReason: strategy
          }
        });
      }
      
      publishSSE('request', successLog);
    });

    if (process.env.NODE_ENV !== 'test' && semanticCache) {
      await semanticCache.set(adapterRequest, response);
    }

    return { ...response, conversationId };
  });

  fastify.post('/v1/chat/stream', async (request, reply) => {
    const payload = request.body as ChatRequest & { conversationId?: string };
    if (!payload || !payload.model || !payload.messages) {
      return reply.status(400).send({ error: 'Invalid request payload' });
    }

    const userId = (request as any).user.id;
    const orgId = (request as any).user.organizationId;
    metrics.activeUsers.add(userId);

    let conversationId = payload.conversationId;
    
    safeDbWrite(async () => {
      if (!conversationId) {
        const conv = await prisma.conversation.create({
          data: { title: payload.messages[0]?.content.substring(0, 50) || 'New Chat', userId }
        });
        conversationId = conv.id;
      }
      const userMessage = payload.messages[payload.messages.length - 1];
      await prisma.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: userMessage.content,
          sequenceNumber: payload.messages.length
        }
      });
    });

    const userMessage = payload.messages[payload.messages.length - 1];
    let piiDetected = false;
    let injectionDetected = false;
    
    const scanner = new SafetyScanner();
    let safeMessages = [];
    try {
      safeMessages = payload.messages.map(msg => {
        if (msg.role === 'user') {
          if (msg.content.match(/(0[3|5|7|8|9])+([0-9]{8})\b/g) || msg.content.match(/\b([0-9]{12})\b/g) || msg.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
            piiDetected = true;
            metrics.detectedPii++;
          }
          const { text } = scanner.scanInput(msg.content);
          return { ...msg, content: text };
        }
        return msg;
      });
    } catch (err: any) {
      injectionDetected = true;
      metrics.blockedPrompts++;
      metrics.errorCount++;
      throw err;
    }

    const registry = await buildRegistryForOrg(orgId);
    const dynamicRouter = new DynamicRouter(registry, globalHealthMonitor, globalCircuitBreakers);
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    let strategy = (request.headers['x-routing-strategy'] as any) || org?.routingStrategy || 'balanced';
    
    if (!safeMessages.some(m => m.role === 'system')) {
      safeMessages.unshift({
        role: 'system',
        content: 'You are a highly intelligent, professional Enterprise AI Assistant. You MUST ALWAYS respond in natural, fluent Vietnamese regardless of the language of the prompt unless explicitly asked to speak another language. Do not hallucinate facts. If you do not know something, say so.'
      });
    }

    const adapterRequest = { ...payload, messages: safeMessages };

    const decision = dynamicRouter.route({
      model: payload.model,
      strategy,
    }, { containsPII: piiDetected });
    
    adapterRequest.model = decision.modelId;

    const isFallback = decision.providerId === 'ollama' || decision.providerId === 'openai';
    const dbProvider = isFallback ? null : await prisma.providerConfig.findUnique({
      where: { name_organizationId: { name: decision.providerId, organizationId: orgId } }
    });
    const decryptedKey = dbProvider?.encryptedApiKey ? decrypt(dbProvider.encryptedApiKey) : undefined;
    const providerType = isFallback ? (decision.providerId === 'ollama' ? 'OLLAMA' : 'OPENAI') : (dbProvider?.providerType || 'OPENAI');

    const adapter = ModelFactory.createAdapter(providerType, {
      apiKey: decryptedKey || process.env.OPENAI_API_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      baseUrl: dbProvider?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    });
    
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    if (request.headers.origin) {
      reply.raw.setHeader('Access-Control-Allow-Origin', request.headers.origin as string);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    reply.raw.write(`data: ${JSON.stringify({ conversationId })}\n\n`);

    let fullResponse = '';
    const startTime = Date.now();

    try {
      const stream = adapter.stream(adapterRequest);
      for await (const chunk of stream) {
        fullResponse += chunk;
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (err: any) {
      console.error('Stream error:', err);
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }

    const latency = Date.now() - startTime;
    reply.raw.write(`data: [DONE]\n\n`);
    reply.raw.end();

    // After stream finishes, save to DB
    safeDbWrite(async () => {
      if (conversationId && fullResponse) {
        await prisma.message.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: fullResponse,
            sequenceNumber: payload.messages.length + 1,
            providerId: decision.providerId,
            modelId: decision.modelId,
            latencyMs: latency,
            costUsd: 0,
            isCacheHit: false,
            routingReason: strategy
          }
        });
      }
    });
  });

}
