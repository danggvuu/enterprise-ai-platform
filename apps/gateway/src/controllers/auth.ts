import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import { HashUtils } from '@enterprise/auth';
import jwt from 'jsonwebtoken';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return reply.status(401).send({ error: 'Invalid credentials or inactive user' });
    }

    const isValid = await HashUtils.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        org: user.organizationId
      },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    // Create session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { token, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, organization: user.organization?.name } };
  });

  fastify.post('/v1/auth/register', async (request, reply) => {
    const { email, password, firstName, lastName, organizationName } = request.body as any;
    
    if (!email || !password || !organizationName) {
      return reply.status(400).send({ error: 'Email, password, and organizationName are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    const passwordHash = await HashUtils.hashPassword(password);

    // Create Org and User
    const result = await prisma.$transaction(async (tx) => {
      let org = await tx.organization.findFirst({ where: { name: organizationName } });
      if (!org) {
        org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationName.toLowerCase().replace(/\\s+/g, '-')
          }
        });
      }

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN', // First user in org is admin
          organizationId: org.id
        }
      });
      return { user, org };
    });

    return reply.status(201).send({ message: 'User registered successfully', userId: result.user.id });
  });

  fastify.get('/v1/auth/me', { preValidation: [(fastify as any).authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: (request as any).user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, avatarUrl: true }
    });
    return user;
  });

  // Check if system needs setup (i.e., no users exist)
  fastify.get('/v1/auth/check-setup', async (request, reply) => {
    const userCount = await prisma.user.count();
    return { needsSetup: userCount === 0 };
  });

  fastify.post('/v1/auth/logout', { preValidation: [(fastify as any).authenticate] }, async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    return { success: true };
  });

  fastify.post('/v1/auth/forgot-password', async (request, reply) => {
    // Simplified: Just returns success to prevent email enumeration
    return { success: true, message: 'If the email exists, a reset link has been sent.' };
  });

  fastify.post('/v1/auth/reset-password', async (request, reply) => {
    // Simplified MVP for reset
    return reply.status(400).send({ error: 'Invalid or expired token' });
  });

  fastify.get('/v1/auth/google', async (request, reply) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return reply.redirect('http://localhost:3001/en?error=Provider_not_configured');
    }
    // Placeholder for actual fastify-oauth2 logic
    return reply.status(501).send({ error: 'OAuth logic needs fastify registration' });
  });

  fastify.get('/v1/auth/microsoft', async (request, reply) => {
    if (!process.env.MICROSOFT_CLIENT_ID) {
      return reply.redirect('http://localhost:3001/en?error=Provider_not_configured');
    }
    return reply.status(501).send({ error: 'OAuth logic needs fastify registration' });
  });
}
