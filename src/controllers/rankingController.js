const prisma = require('../config/prismaClient');

exports.getRanking = async (req, res) => {
  try {
    const bobotKriteria = await prisma.bobotKriteria.findMany();
    const bobotMap = {};
    bobotKriteria.forEach(b => {
      bobotMap[b.kriteriaId] = b.bobot;
    });

    const karyawan = await prisma.karyawan.findMany({
      include: { penilaian: true }
    });

    const ranking = karyawan.map(k => {
      let total = 0;
      k.penilaian.forEach(p => {
        const bobot = bobotMap[p.kriteriaId] || 0;
        total += p.nilai * bobot;
      });
      return {
        id: k.id,
        nama: k.nama,
        posisi: k.posisi,
        totalSkor: total
      };
    });

    ranking.sort((a, b) => b.totalSkor - a.totalSkor);
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
