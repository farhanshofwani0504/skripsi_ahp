const express = require("express");
const router = express.Router();
const penilaianController = require("../controllers/penilaianController");
const authMiddleware = require("../middleware/auth");
const prisma = require("../config/prismaClient");

// GET penilaian (semua atau berdasarkan karyawanId)
router.get("/", authMiddleware, async (req, res) => {
  const { karyawanId } = req.query;

  if (karyawanId) {
    // Ambil penilaian spesifik karyawan
    try {
      const data = await prisma.penilaian.findMany({
        where: { karyawanId: parseInt(karyawanId) },
        include: { kriteria: true, karyawan: true },
      });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Jika tidak ada karyawanId, ambil semua
  return penilaianController.getAllPenilaian(req, res);
});

// Tambah atau update penilaian
router.post("/", authMiddleware, penilaianController.upsertPenilaian);

// Hapus penilaian
router.delete("/:id", authMiddleware, penilaianController.deletePenilaian);

router.get("/summary/overview/:karyawanId", penilaianController.getOverview);

module.exports = router;
