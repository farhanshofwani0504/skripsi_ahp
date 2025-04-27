const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bobotAHP = {
    Disiplin: 0.26,
    Produktivitas: 0.63,
    Kerjasama: 0.11
  };

  const kriteria = await prisma.kriteria.findMany();

  for (const k of kriteria) {
    const bobot = bobotAHP[k.nama];
    if (!bobot) {
      console.log(`⚠️ Bobot tidak ditemukan untuk kriteria: ${k.nama}`);
      continue;
    }

    const existing = await prisma.bobotKriteria.findUnique({
      where: { kriteriaId: k.id }
    });

    if (existing) {
      await prisma.bobotKriteria.update({
        where: { kriteriaId: k.id },
        data: { bobot }
      });
      console.log(`🔁 Update bobot "${k.nama}" = ${bobot}`);
    } else {
      await prisma.bobotKriteria.create({
        data: { kriteriaId: k.id, bobot }
      });
      console.log(`✅ Insert bobot "${k.nama}" = ${bobot}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
