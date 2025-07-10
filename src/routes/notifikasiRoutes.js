const express = require("express");
const router = express.Router();
const notifikasiController = require("../controllers/notifikasiController");
const authMiddleware = require("../middleware/auth");

// Route untuk kirim email warning massal
router.post(
  "/kirim-peringatan",
  authMiddleware,
  notifikasiController.kirimPeringatan
);

// Route untuk kirim email ke karyawan tertentu
router.post(
  "/kirim-email-karyawan",
  authMiddleware,
  notifikasiController.kirimEmailKaryawan
);

router.post(
  "/pemecatan",
  authMiddleware,
  notifikasiController.kirimNotifikasiMassal
);

module.exports = router;
