const express = require('express');
const router = express.Router();
const ahpController = require('../controllers/ahpController');

router.post('/calculate', ahpController.calculateAHP);
router.post('/save', ahpController.saveAHPWeights);

module.exports = router;
