const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const karyawanList = await prisma.karyawan.findMany();
  const kriteriaList = await prisma.kriteria.findMany();

  console.log(`Found ${karyawanList.length} Karyawan.`);
  console.log(`Found ${kriteriaList.length} Kriteria.`);

  let totalInserted = 0;

  for (const karyawan of karyawanList) {
    // Randomly determine months of data (3 to 12 months)
    const monthsToGenerate = Math.floor(Math.random() * (12 - 3 + 1)) + 3;
    const today = new Date();

    for (let i = 0; i < monthsToGenerate; i++) {
      const evaluationDate = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        Math.floor(Math.random() * 28) + 1 // Random day of the month
      );

      for (const kriteria of kriteriaList) {
        await prisma.penilaian.create({
          data: {
            karyawanId: karyawan.id,
            kriteriaId: kriteria.id,
            nilai: Math.floor(Math.random() * 5) + 1, // Nilai 1-5
            createdAt: evaluationDate,
          },
        });
        totalInserted++;
      }
    }
  }

  console.log(`✅ Penilaian baru ditambahkan: ${totalInserted} entri`);
}

module.exports = { main };