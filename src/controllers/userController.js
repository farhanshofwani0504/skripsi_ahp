const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');

// GET /api/user - list all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/user/:id - get user by id
exports.getUserById = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalid' });
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/user - add user (ADMIN only)
exports.addUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed, role }
    });
    res.status(201).json({ message: 'User created', user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email atau username sudah dipakai' });
    }
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/user/:id - edit user (ADMIN only)
exports.editUser = async (req, res) => {
  const id = Number(req.params.id);
  const { username, email, password, role } = req.body;
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalid' });
  if (!username && !email && !password && !role) {
    return res.status(400).json({ error: 'Tidak ada field di-update' });
  }
  try {
    const data = {};
    if (username) data.username = username;
    if (email) data.email = email;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ id: updated.id, username: updated.username, email: updated.email, role: updated.role });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email atau username sudah dipakai' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/user/:id - delete user (ADMIN only)
exports.deleteUser = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalid' });
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: `User #${id} terhapus ✅` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.status(500).json({ error: err.message });
  }
}; 