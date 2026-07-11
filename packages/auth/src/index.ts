import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { prisma } from '@ai-gateway/database';
import { UnauthorizedError } from '@enterprise/errors';

export interface AuthOptions {
  jwtSecret: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      role: string;
      organizationId: string;
    };
  }
  interface FastifyInstance {
    authenticate: any;
    requireRole: any;
  }
}

export const authPlugin: FastifyPluginAsync<AuthOptions> = async (fastify, options) => {
  if (!options.jwtSecret) {
    throw new Error('jwtSecret is required for Auth Plugin');
  }

  // Middleware to authenticate JWT and verify RBAC
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, options.jwtSecret) as any;
      
      // Load session from DB to ensure it hasn't been revoked
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedError('Session expired or invalid');
      }

      request.user = {
        id: session.user.id,
        role: session.user.role,
        organizationId: session.user.organizationId || ''
      };
    } catch (err: any) {
      reply.status(401).send({ error: 'Unauthorized', message: err.message });
    }
  });

  // Role verification helper
  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user || !roles.includes(request.user.role)) {
        reply.status(403).send({ error: 'Forbidden', message: 'Insufficient role permissions' });
      }
    };
  });
};

export const EnterpriseAuth = fp(authPlugin, {
  name: '@enterprise/auth'
});

// Re-export Argon2 helpers for external controller usage
export const HashUtils = {
  hashPassword: (password: string) => argon2.hash(password),
  verifyPassword: (hash: string, password: string) => argon2.verify(hash, password)
};
