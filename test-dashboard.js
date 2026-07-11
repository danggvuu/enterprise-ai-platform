const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log('No admin user found!');
    return;
  }
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, org: user.organizationId },
    process.env.JWT_SECRET || 'supersecret',
    { expiresIn: '7d' }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt, ipAddress: '127.0.0.1' }
  });

  const res = await fetch('http://localhost:8080/v1/admin/dashboard', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}
main().catch(console.error).finally(() => prisma.$disconnect());
