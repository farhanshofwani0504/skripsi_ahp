module.exports = (allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ error: 'Akses ditolak: role tidak ditemukan' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Akses ditolak: role tidak diizinkan' });
  }
  next();
}; 