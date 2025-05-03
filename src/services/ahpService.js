const prisma = require("../config/prismaClient");
const { calcCR } = require("../utils/ahp");

/**
 * Hitung bobot + CR dan simpan ke tabel BobotKriteria
 * @param {number[][]} pairwiseMatrix
 * @param {number[]} kriteriaIds – urutan harus sama dg matrix
 */
exports.recalculateAHP = async (pairwiseMatrix, kriteriaIds) => {
  const { weights, CR } = calcCR(pairwiseMatrix);

  // update bobot + cr untuk tiap kriteria
  const ops = weights.map((weight, idx) =>
    prisma.bobotKriteria.upsert({
      where: { kriteriaId: kriteriaIds[idx] },
      update: { bobot: weight, cr: CR },
      create: { kriteriaId: kriteriaIds[idx], bobot: weight, cr: CR },
    })
  );
  await prisma.$transaction(ops);

  return CR;
};
