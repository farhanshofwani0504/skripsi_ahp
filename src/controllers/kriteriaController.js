const prisma = require("../config/prismaClient");
const { recalculateAHP } = require("../services/ahpService");

// Ambil semua kriteria
exports.getAllKriteria = async (req, res) => {
  try {
    const data = await prisma.kriteria.findMany({
      include: { penilaian: true },
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
      data: { nama },
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
    res.json({ message: "Kriteria berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.recalculate = async (req, res, next) => {
  const { matrix, kriteriaIds } = req.body;
  try {
    const cr = await recalculateAHP(matrix, kriteriaIds);
    res.json({ message: "Bobot ter‑update", cr });
  } catch (err) {
    next(err);
  }
};
