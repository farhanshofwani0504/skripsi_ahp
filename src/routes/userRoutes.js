const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Semua endpoint hanya untuk ADMIN
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), userController.getAllUsers);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN']), userController.getUserById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), userController.addUser);
router.patch('/:id', authMiddleware, roleMiddleware(['ADMIN']), userController.editUser);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), userController.deleteUser);

module.exports = router; 