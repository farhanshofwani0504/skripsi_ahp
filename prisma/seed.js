const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('\n⏳ Menjalankan semua seed...');

  const { main: seedKriteria } = require('./seedKriteria.js');
  const { main: seedKaryawan } = require('./seedKaryawan.js');
  const { main: seedPenilaian } = require('./seedPenilaian.js');
  const { main: seedBobotKriteria } = require('./seedBobotKriteria.js');

  await seedKriteria();
  await seedKaryawan();
  await seedPenilaian();
  await seedBobotKriteria();

  await prisma.$disconnect();
  console.log('✅ Semua seed selesai dijalankan.');
}

run().catch(console.error);