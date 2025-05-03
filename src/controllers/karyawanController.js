const prisma = require("../config/prismaClient");

// GET /api/karyawan
const getAllKaryawan = async (_req, res, next) => {
  try {
    const data = await prisma.karyawan.findMany({
      include: {
        penilaian: {
          // kalau mau sekalian kriteria, uncomment
          // include: { kriteria: true }
        },
      },
      orderBy: { id: "asc" },
    });
    res.json(data);
  } catch (err) {
    next(err); // lempar ke error handler global
  }
};

// POST /api/karyawan
const addKaryawan = async (req, res, next) => {
  const { nama, posisi, email } = req.body;
  if (!nama || !posisi) {
    return res.status(400).json({ message: "nama & posisi wajib diisi" });
  }

  try {
    const newKaryawan = await prisma.karyawan.create({
      data: { nama, posisi, email: email || null },
    });
    res.status(201).json(newKaryawan);
  } catch (err) {
    // email duplicate
    if (err.code === "P2002" && err.meta?.target?.includes("email")) {
      return res.status(409).json({ message: "email sudah dipakai" });
    }
    next(err);
  }
};

// DELETE /api/karyawan/:id
const deleteKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalid" });
  }

  try {
    await prisma.karyawan.delete({ where: { id } });
    res.json({ message: `karyawan #${id} terhapus ✅` });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "karyawan tidak ditemukan" });
    }
    next(err);
  }
};

const updateKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  const { nama, posisi, email } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalid" });
  }
  if (!nama && !posisi && !email) {
    return res.status(400).json({ message: "Tidak ada field yang di‑update" });
  }

  try {
    const updated = await prisma.karyawan.update({
      where: { id },
      data: {
        ...(nama && { nama }),
        ...(posisi && { posisi }),
        ...(email && { email }),
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("email")) {
      return res.status(409).json({ message: "Email sudah dipakai" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    }
    next(err);
  }
};

module.exports = {
  getAllKaryawan,
  addKaryawan,
  deleteKaryawan,
  updateKaryawan, // ←  ❗ tambahkan baris ini
};
