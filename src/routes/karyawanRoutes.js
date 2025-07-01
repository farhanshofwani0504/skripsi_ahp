const express = require("express");
const {
  getAllKaryawan,
  addKaryawan,
  deleteKaryawan,
  updateKaryawan,
  getKaryawanById,
  downloadLaporanKaryawan
} = require("../controllers/karyawanController"); // ← controller juga CJS

const router = express.Router();

router.get("/:id", getKaryawanById);
router.get("/", getAllKaryawan);
router.post("/", addKaryawan);
router.delete("/:id", deleteKaryawan);
router.patch("/:id", updateKaryawan);
router.put("/:id", updateKaryawan);
router.get("/:id/report", downloadLaporanKaryawan);

module.exports = router;
