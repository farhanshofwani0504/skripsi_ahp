// src/utils/score.js
const THRESHOLDS = [
  { min: 4.5, grade: "A" },
  { min: 3.5, grade: "B" },
  { min: 2.5, grade: "C" },
  { min: 1.5, grade: "D" },
  { min: 1.0, grade: "E" }, // asumsi minimal skor AHP = 1
];

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
  const match = THRESHOLDS.find((t) => avg >= t.min);
  return match ? match.grade : "N/A"; // bisa juga null, atau "?" tergantung preferensimu
};

module.exports = { calcRollingAvg, toGrade };
