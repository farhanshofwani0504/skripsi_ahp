const express = require("express");
const { 
  getAllKaryawan,
  addKaryawan,
  deleteKaryawan,
  updateKaryawan,
  getKaryawanById,
  downloadLaporanKaryawan,
  downloadGradesExcel,
  downloadRawScoresExcel,
  getKaryawanPenilaian,
  pemecatanKaryawanById,
  generateRekapGlobalPDF,
  importCsvKaryawan,
  importCsvNilai,
  reviewPerpanjanganKontrak
} = require("../controllers/karyawanController"); // ← controller juga CJS

const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'tmp/' });

router.get("/:id", getKaryawanById);
router.get("/", getAllKaryawan);
router.post("/", addKaryawan);
router.delete("/:id", deleteKaryawan);
router.patch("/:id", updateKaryawan);
router.put("/:id", updateKaryawan);
router.get("/:id/report", downloadLaporanKaryawan);
router.get("/grades/excel", downloadGradesExcel);
router.get("/raw-scores/excel", downloadRawScoresExcel);
router.get("/:id/penilaian", getKaryawanPenilaian);
router.post("/:id/pemecatan", pemecatanKaryawanById);
router.get("/rekap/global/pdf", generateRekapGlobalPDF);
router.post('/import-csv-karyawan', upload.single('file'), importCsvKaryawan);
router.post('/import-csv-nilai', upload.single('file'), importCsvNilai);
router.get('/:id/review-perpanjangan', reviewPerpanjanganKontrak);

module.exports = router;
