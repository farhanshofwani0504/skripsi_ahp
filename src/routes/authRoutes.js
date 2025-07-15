const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

// router.post('/register', auth.register); // Dihapus, diganti add user khusus admin
router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password/:token', auth.resetPassword);

module.exports = router;
