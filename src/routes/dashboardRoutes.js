const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Semua endpoint dashboard
router.get('/kesimpulan', authMiddleware, dashboardController.getKesimpulanGlobal);
router.get('/skor-karyawan', authMiddleware, dashboardController.getSkorKaryawan);
router.get('/ringkasan-bulanan', authMiddleware, dashboardController.getRingkasanBulanan);

module.exports = router;
