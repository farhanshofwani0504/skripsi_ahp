const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  const karyawanData = Array.from({ length: 100 }).map(() => ({
    nama: faker.person.fullName(),
    posisi: faker.person.jobTitle()
  }));

  await prisma.karyawan.createMany({ data: karyawanData });
  console.log('✅ 100 Karyawan berhasil di-seed.');
}

module.exports = { main };
