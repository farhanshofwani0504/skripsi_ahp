const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Semua endpoint dashboard
router.get('/kesimpulan', authMiddleware, roleMiddleware(['ADMIN', 'OWNER']), dashboardController.getKesimpulanGlobal);
router.get('/skor-karyawan', authMiddleware, roleMiddleware(['ADMIN', 'OWNER']), dashboardController.getSkorKaryawan);
router.get('/ringkasan-bulanan', authMiddleware, roleMiddleware(['ADMIN', 'OWNER']), dashboardController.getRingkasanBulanan);

module.exports = router;
