const express = require("express");
const router = express.Router();
const karyawanController = require("../controllers/karyawanController");
const prisma = require("../config/prismaClient");

// GET semua karyawan
router.get("/", karyawanController.getAllKaryawan);

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await prisma.karyawan.findUnique({ where: { id } });
  if (!data) return res.status(404).json({ error: "Karyawan tidak ditemukan" });
  res.json(data);
});

// POST tambah karyawan
router.post("/", karyawanController.addKaryawan);

// DELETE hapus karyawan

router.delete("/:id", karyawanController.deleteKaryawan);

console.log("keys:", Object.keys(karyawanController));
router.put("/:id", karyawanController.updateKaryawan);

module.exports = router;
