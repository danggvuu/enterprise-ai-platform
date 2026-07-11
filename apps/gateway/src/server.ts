import Fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { EnterpriseLogger } from '@enterprise/logger';
import { EnterpriseAuth } from '@enterprise/auth';
import Redis from 'ioredis';
import cors from '@fastify/cors';

import authRoutes from './controllers/auth';
import portalRoutes from './controllers/portal';
import adminRoutes from './controllers/admin';
import chatRoutes from './controllers/chat';

const logger = new EnterpriseLogger();

export let redis: Redis;

export const requestLogs: any[] = [];
export const sseClients = new Set<any>();

export function publishSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.raw.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

export let currentGlobalStrategy = 'balanced';

export const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  blockedPrompts: 0,
  detectedPii: 0,
  circuitBreakerEvents: 0,
  errorCount: 0,
  activeUsers: new Set<string>(),
};

export const buildServer = async (): Promise<FastifyInstance> => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: process.env.NODE_ENV === 'test' ? null : (times) => Math.min(times * 50, 2000),
    });
  }

  const server = Fastify({
    logger: false, 
    connectionTimeout: 30000, // 30s Gateway timeout
    keepAliveTimeout: 30000,
  });

  server.setErrorHandler((error: any, request, reply) => {
    logger.error({ message: `Unhandled error in Gateway: ${error.message}` });
    
    // Default fallback
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred. Please try again later.';
    let recoveryHint = undefined;

    // Fastify errors (e.g., validation, 404, rate limit)
    if (error.statusCode) {
      statusCode = error.statusCode;
      code = error.code || 'API_ERROR';
      message = error.message;
    }

    // Prisma / Database offline
    if (error.message.includes('Prisma') || error.message.includes('fetch failed')) {
      statusCode = 503;
      code = 'DATABASE_UNAVAILABLE';
      message = 'The platform database is temporarily unavailable.';
      recoveryHint = 'We are working on restoring the service. Please check back soon.';
    }

    // Connection issues
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 502;
      code = 'UPSTREAM_ERROR';
      message = 'Could not connect to the upstream AI provider.';
      recoveryHint = 'The provider might be offline or starting up. We will automatically switch providers on retry.';
    }

    // EnterpriseError instances
    if ((error as any).isOperational) {
      statusCode = (error as any).statusCode || 400;
      code = (error as any).code || 'OPERATIONAL_ERROR';
      message = error.message;
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message,
        requestId: request.id,
        recoveryHint
      }
    });
  });

  await server.register(cors, {
    origin: '*',
    credentials: true,
  });

  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Enterprise AI Gateway API',
        description: 'Global Cloud API Gateway for AI models',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'full', deepLinking: false },
  });

  if (process.env.NODE_ENV !== 'test') {
    await server.register(rateLimit, {
      max: 100, 
      timeWindow: '1 minute',
      redis: redis,
      keyGenerator: (req) => (req as any).apiKey || req.ip,
      errorResponseBuilder: (req, context) => ({
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
        date: Date.now(),
        expiresIn: context.ttl 
      })
    });
  }

  // Health suite
  server.get('/health', async () => {
    logger.info({ message: 'Health check ping received' });
    let redisStatus = 'ok';
    if (process.env.NODE_ENV !== 'test') {
      try { await redis.ping(); } catch (e) { redisStatus = 'error'; }
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: redisStatus,
      version: '1.0.0',
      memory: process.memoryUsage(),
    };
  });

  server.get('/live', async (request, reply) => {
    reply.status(200).send({ status: 'alive' });
  });

  server.get('/ready', async (request, reply) => {
    try {
      // Check Redis
      if (process.env.NODE_ENV !== 'test') {
        await redis.ping();
      }
      reply.status(200).send({ status: 'ready' });
    } catch (e) {
      reply.status(503).send({ status: 'unready', reason: 'Redis unavailable' });
    }
  });

  server.register(async (api) => {
    // Enterprise Auth Plugin
    api.register(EnterpriseAuth, {
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
    });

    api.register(authRoutes);
    api.register(portalRoutes);
    api.register(adminRoutes);
    api.register(chatRoutes);
  });

  server.addHook('onClose', async () => {
    redis.disconnect();
  });

  return server;
};

if (require.main === module) {
  const start = async () => {
    const server = await buildServer();
    try {
      await server.ready();
      server.swagger(); 
      await server.listen({ port: 3000, host: '0.0.0.0' });
      logger.info({ message: 'Enterprise AI Gateway started on port 3000' });
    } catch (err) {
      logger.error({ message: 'Error starting server', error: err as Error });
      process.exit(1);
    }
  };
  start();
}
