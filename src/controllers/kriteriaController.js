const prisma = require('../config/prismaClient');

// Ambil semua kriteria
exports.getAllKriteria = async (req, res) => {
  try {
    const data = await prisma.kriteria.findMany({
      include: { penilaian: true }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tambah kriteria
exports.addKriteria = async (req, res) => {
  const { nama } = req.body;
  try {
    const newKriteria = await prisma.kriteria.create({
      data: { nama }
    });
    res.status(201).json(newKriteria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hapus kriteria
exports.deleteKriteria = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.kriteria.delete({ where: { id } });
    res.json({ message: 'Kriteria berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
