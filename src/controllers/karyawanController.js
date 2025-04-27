const prisma = require('../config/prismaClient');

// Ambil semua data karyawan
exports.getAllKaryawan = async (req, res) => {
  try {
    const data = await prisma.karyawan.findMany({
      include: { penilaian: true }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tambah karyawan baru
exports.addKaryawan = async (req, res) => {
  const { nama, posisi } = req.body;
  try {
    const newKaryawan = await prisma.karyawan.create({
      data: { nama, posisi }
    });
    res.status(201).json(newKaryawan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hapus karyawan
exports.deleteKaryawan = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.karyawan.delete({ where: { id } });
    res.json({ message: 'Karyawan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
