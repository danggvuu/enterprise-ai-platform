import { prisma } from '@ai-gateway/database';
import { HashUtils } from '@enterprise/auth';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const orgName = process.argv[4] || 'Default Org';

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [orgName]');
    process.exit(1);
  }

  console.log(`Creating/Updating Admin account...`);
  console.log(`Email: ${email}`);
  console.log(`Organization: ${orgName}`);

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    console.log(`User ${email} already exists. Resetting password...`);
    const passwordHash = await HashUtils.hashPassword(password);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash, isActive: true }
    });
    console.log(`Password reset successfully.`);
    return;
  }

  // Create organization
  let org = await prisma.organization.findFirst({ where: { name: orgName } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      }
    });
  }

  // Create admin user
  const passwordHash = await HashUtils.hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
      organizationId: org.id
    }
  });

  console.log(`Admin user created successfully with ID: ${user.id}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
