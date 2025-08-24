const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('bahaya12', 10);
  const ownerPassword = await bcrypt.hash('bahaya12', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'hr_bukipet',
      email: 'hr_bukipet@gmail.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      username: 'owner_bukipet',
      email: 'owner_bukipet@gmail.com',
      password: ownerPassword,
      role: 'OWNER',
    },
  });

  console.log('✅ User ADMIN dan OWNER berhasil ditambahkan.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 