const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.karyawan.count();
  if (existing === 0) {
    const karyawanData = Array.from({ length: 30 }).map(() => ({
      nama: faker.person.fullName(),
      posisi: faker.person.jobTitle()
    }));

    await prisma.karyawan.createMany({ data: karyawanData });
    console.log('✅ 30 Karyawan berhasil di-seed.');
  } else {
    console.log('⚠️ Karyawan sudah ada, tidak disisipkan ulang.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
