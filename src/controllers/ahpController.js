const prisma = require('../config/prismaClient');

exports.calculateAHP = (req, res) => {
  const matrix = req.body.matrix; // 2D array
  const n = matrix.length;

  // Hitung jumlah kolom
  const colSums = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      colSums[j] += matrix[i][j];
    }
  }

  // Normalisasi matriks
  const normalized = [];
  for (let i = 0; i < n; i++) {
    normalized[i] = [];
    for (let j = 0; j < n; j++) {
      normalized[i][j] = matrix[i][j] / colSums[j];
    }
  }

  // Hitung rata-rata baris (eigenvector)
  const priorities = normalized.map(row => {
    return row.reduce((sum, val) => sum + val, 0) / n;
  });

  // Hitung λ_max
  const lambdaMax = priorities.reduce((sum, weight, i) => {
    const rowSum = matrix[i].reduce((sum, val, j) => sum + val * priorities[j], 0);
    return sum + rowSum / weight;
  }, 0) / n;

  // Hitung Consistency Index (CI)
  const CI = (lambdaMax - n) / (n - 1);

  // Nilai RI (Random Index)
  const RI_table = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
  const RI = RI_table[n] || 1.49;

  // Hitung CR
  const CR = CI / RI;

  res.json({
    priorities,
    lambdaMax,
    CI,
    CR,
    isConsistent: CR < 0.1
  });
};

exports.saveAHPWeights = async (req, res) => {
  const { weights } = req.body;
  try {
    const result = [];

    for (const item of weights) {
      const { kriteriaId, bobot } = item;

      const existing = await prisma.bobotKriteria.findFirst({
        where: { kriteriaId }
      });

      if (existing) {
        const updated = await prisma.bobotKriteria.update({
          where: { id: existing.id },
          data: { bobot }
        });
        result.push(updated);
      } else {
        const created = await prisma.bobotKriteria.create({
          data: { kriteriaId, bobot }
        });
        result.push(created);
      }
    }

    res.json({ message: 'Bobot disimpan', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
