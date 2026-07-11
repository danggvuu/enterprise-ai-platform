import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.logTrace.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
    select: { prompt: true, providerId: true, modelId: true, costUsd: true, status: true }
  });
  console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
