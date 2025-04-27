const prisma = require('../config/prismaClient');

// Ambil semua penilaian (tanpa filter)
exports.getAllPenilaian = async (req, res) => {
  try {
    const data = await prisma.penilaian.findMany({
      include: {
        karyawan: true,
        kriteria: true
      }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tambah atau update penilaian
exports.upsertPenilaian = async (req, res) => {
  const { karyawanId, kriteriaId, nilai } = req.body;

  try {
    const existing = await prisma.penilaian.findFirst({
      where: { karyawanId, kriteriaId }
    });

    let penilaian;
    if (existing) {
      penilaian = await prisma.penilaian.update({
        where: { id: existing.id },
        data: { nilai }
      });
    } else {
      penilaian = await prisma.penilaian.create({
        data: { karyawanId, kriteriaId, nilai }
      });
    }

    res.json(penilaian);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hapus penilaian
exports.deletePenilaian = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.penilaian.delete({ where: { id } });
    res.json({ message: 'Penilaian berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
