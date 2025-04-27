const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const karyawanList = await prisma.karyawan.findMany();
  const kriteriaList = await prisma.kriteria.findMany();

  let totalInserted = 0;

  for (const karyawan of karyawanList) {
    for (const kriteria of kriteriaList) {
      const existing = await prisma.penilaian.findFirst({
        where: {
          karyawanId: karyawan.id,
          kriteriaId: kriteria.id
        }
      });

      if (!existing) {
        await prisma.penilaian.create({
          data: {
            karyawanId: karyawan.id,
            kriteriaId: kriteria.id,
            nilai: Math.floor(Math.random() * 5) + 1
          }
        });
        totalInserted++;
      }
    }
  }

  console.log(`✅ Penilaian baru ditambahkan: ${totalInserted} entri`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
