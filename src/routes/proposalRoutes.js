const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// ADMIN: create proposal
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), proposalController.createProposal);
// ADMIN/OWNER: list & detail proposal
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'OWNER']), proposalController.listProposal);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OWNER']), proposalController.detailProposal);
// OWNER: approve/reject proposal
router.patch('/:id/keputusan', authMiddleware, roleMiddleware(['OWNER']), proposalController.keputusanProposal);

module.exports = router; 