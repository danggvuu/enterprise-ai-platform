import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';

export default async function portalRoutes(fastify: FastifyInstance) {
  // All routes here require authentication
  fastify.addHook('preValidation', (fastify as any).authenticate);

  // --- Folders ---
  fastify.get('/v1/portal/folders', async (request, reply) => {
    const userId = (request as any).user.id;
    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return folders;
  });

  fastify.post('/v1/portal/folders', async (request, reply) => {
    const userId = (request as any).user.id;
    const { name } = request.body as { name: string };
    
    if (!name) return reply.status(400).send({ error: 'Folder name is required' });
    
    const folder = await prisma.folder.create({
      data: { name, userId }
    });
    return folder;
  });

  fastify.delete('/v1/portal/folders/:id', async (request, reply) => {
    const userId = (request as any).user.id;
    const { id } = request.params as { id: string };
    
    await prisma.folder.deleteMany({
      where: { id, userId }
    });
    return { success: true };
  });

  // --- Conversations ---
  fastify.get('/v1/portal/conversations', async (request, reply) => {
    const userId = (request as any).user.id;
    const conversations = await prisma.conversation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });
    return conversations;
  });

  fastify.post('/v1/portal/conversations', async (request, reply) => {
    const userId = (request as any).user.id;
    const { title, folderId } = request.body as { title?: string, folderId?: string };
    
    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Conversation',
        userId,
        folderId: folderId || null
      }
    });
    return conversation;
  });

  fastify.get('/v1/portal/conversations/:id', async (request, reply) => {
    const userId = (request as any).user.id;
    const { id } = request.params as { id: string };
    
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        messages: {
          orderBy: { sequenceNumber: 'asc' },
          include: { attachments: true }
        }
      }
    });
    
    if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });
    return conversation;
  });

  fastify.patch('/v1/portal/conversations/:id', async (request, reply) => {
    const userId = (request as any).user.id;
    const { id } = request.params as { id: string };
    const data = request.body as any; // title, folderId, isPinned
    
    const conversation = await prisma.conversation.updateMany({
      where: { id, userId },
      data
    });
    return { success: true };
  });

  fastify.delete('/v1/portal/conversations/:id', async (request, reply) => {
    const userId = (request as any).user.id;
    const { id } = request.params as { id: string };
    
    await prisma.conversation.updateMany({
      where: { id, userId },
      data: { deletedAt: new Date() }
    });
    return { success: true };
  });
}
