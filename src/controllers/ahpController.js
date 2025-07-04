const prisma = require('../config/prismaClient');
const { recalculateAHP } = require('../services/ahpService');
const { calcCR } = require('../utils/ahp');

exports.calculateAHP = async (req, res) => {
  const { matrix, kriteriaIds } = req.body; // Asumsi kriteriaIds juga dikirim

  if (!matrix || !Array.isArray(matrix) || matrix.length === 0 || !kriteriaIds || !Array.isArray(kriteriaIds) || kriteriaIds.length === 0) {
    return res.status(400).json({ error: 'Matrix dan Kriteria IDs wajib diisi dan dalam format yang benar.' });
  }

  if (matrix.length !== kriteriaIds.length) {
    return res.status(400).json({ error: 'Jumlah kriteria dalam matrix tidak sesuai dengan jumlah kriteriaIds.' });
  }

  try {
    // Hitung CR dan bobot menggunakan fungsi dari utils/ahp
    const { weights, lambdaMax, CI, CR } = calcCR(matrix);

    // Simpan bobot dan CR ke database melalui service
    await recalculateAHP(matrix, kriteriaIds);

    res.status(200).json({
      priorities: weights,
      lambdaMax,
      CI,
      CR,
      isConsistent: CR < 0.1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
