const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allKaryawan = await prisma.karyawan.findMany();
  const allKriteria = await prisma.kriteria.findMany();

  let totalDeleted = 0;

  for (const k of allKaryawan) {
    for (const krit of allKriteria) {
      const records = await prisma.penilaian.findMany({
        where: {
          karyawanId: k.id,
          kriteriaId: krit.id
        },
        orderBy: { id: 'asc' }
      });

      if (records.length > 1) {
        // Keep the first one, delete sisanya
        const [first, ...dupes] = records;
        const idsToDelete = dupes.map(d => d.id);

        await prisma.penilaian.deleteMany({
          where: { id: { in: idsToDelete } }
        });

        console.log(`🗑 Deleted ${idsToDelete.length} duplicates for karyawan ${k.id}, kriteria ${krit.id}`);
        totalDeleted += idsToDelete.length;
      }
    }
  }

  console.log(`✅ Pembersihan selesai. Total duplikat dihapus: ${totalDeleted}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
