const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Hitung ulang skor karyawan berdasarkan
 * 6 (enam) bulan terakhir.
 * @param {number} karyawanId
 */
async function hitungSkor6Bulan(karyawanId) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6); // 6 bulan ke belakang

  const pen = await prisma.penilaian.findMany({
    where: { karyawanId, createdAt: { gte: cutoff } },
    include: { kriteria: { include: { bobotKriteria: true } } },
  });

  // group by bulan (YYYY‑MM)
  const byMonth = {};
  pen.forEach((p) => {
    const key = p.createdAt.toISOString().slice(0, 7);
    const w = p.kriteria.bobotKriteria?.bobot || 0;
    byMonth[key] = (byMonth[key] || 0) + w * p.nilai;
  });

  const avg = Object.keys(byMonth).length
    ? Object.values(byMonth).reduce((a, b) => a + b, 0) /
      Object.keys(byMonth).length
    : 0;

  await prisma.karyawan.update({
    where: { id: karyawanId },
    data: { skor: avg },
  });
}

module.exports = { hitungSkor6Bulan };
