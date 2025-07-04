// src/utils/score.js
const calcRollingAvg = async (prisma, karyawanId) => {
  const from = new Date();
  from.setMonth(from.getMonth() - 3);

  const { _avg } = await prisma.penilaian.aggregate({
    _avg: { nilai: true },
    where: { karyawanId, createdAt: { gte: from } },
  });

  return Number(_avg.nilai ?? 0);
};

const toGrade = (avg) => {
  if (avg >= 4.5) return "A";
  if (avg >= 3.5) return "B";
  if (avg >= 2.5) return "C";
  if (avg > 1.5) return "D"; // Diubah menjadi > 1.5 agar 1.5 masuk grade E
  if (avg >= 0) return "E";   // Grade E untuk skor dari 0 hingga 1.5
  return "N/A"; // Untuk skor negatif (seharusnya tidak terjadi)
};

module.exports = { calcRollingAvg, toGrade };
