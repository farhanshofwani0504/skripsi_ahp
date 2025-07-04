const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.kriteria.findMany();
  const defaultKriteria = ['Disiplin', 'Produktivitas', 'Kerjasama'];

  for (const nama of defaultKriteria) {
    const found = existing.find(k => k.nama === nama);
    if (!found) {
      await prisma.kriteria.create({ data: { nama } });
      console.log(`✅ Kriteria "${nama}" disisipkan`);
    } else {
      console.log(`⚠️ Kriteria "${nama}" sudah ada`);
    }
  }
}

module.exports = { main };
