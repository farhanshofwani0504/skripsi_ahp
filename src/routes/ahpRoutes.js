const express = require('express');
const router = express.Router();
const ahpController = require('../controllers/ahpController');

router.post('/calculate', ahpController.calculateAHP);
module.exports = router;
