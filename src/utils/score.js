// src/utils/score.js
const THRESHOLDS = [
  { min: 5, grade: "A" },
  { min: 4, grade: "B" },
  { min: 3, grade: "C" },
  { min: 2, grade: "D" },
  { min: 1, grade: "E" },
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
