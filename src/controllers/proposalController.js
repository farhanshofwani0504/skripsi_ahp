const prisma = require('../config/prismaClient');

// Create proposal (ADMIN)
exports.createProposal = async (req, res) => {
  const { karyawanId, jenis, alasan, tanggalMulaiBaru, tanggalAkhirBaru } = req.body;
  const userId = req.user.userId;
  if (!karyawanId || !jenis || !alasan) {
    return res.status(400).json({ error: 'Field wajib: karyawanId, jenis, alasan' });
  }
  try {
    const proposal = await prisma.proposalKontrak.create({
      data: {
        karyawanId,
        jenis,
        alasan,
        tanggalMulaiBaru: tanggalMulaiBaru ? new Date(tanggalMulaiBaru) : undefined,
        tanggalAkhirBaru: tanggalAkhirBaru ? new Date(tanggalAkhirBaru) : undefined,
        createdBy: userId,
      },
      include: { karyawan: true, createdByUser: true }
    });
    res.status(201).json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List proposal (ADMIN/OWNER, bisa filter by status/jenis)
exports.listProposal = async (req, res) => {
  const { status, jenis } = req.query;
  const where = {};
  if (status) where.status = status;
  if (jenis) where.jenis = jenis;
  try {
    const proposals = await prisma.proposalKontrak.findMany({
      where,
      include: { karyawan: true, createdByUser: true },
      orderBy: { tanggalPengajuan: 'desc' }
    });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Detail proposal (ADMIN/OWNER)
exports.detailProposal = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalid' });
  try {
    const proposal = await prisma.proposalKontrak.findUnique({
      where: { id },
      include: { karyawan: true, createdByUser: true }
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// OWNER approve/reject proposal
exports.keputusanProposal = async (req, res) => {
  const id = Number(req.params.id);
  const { status, catatanOwner } = req.body;
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalid' });
  if (!['DISETUJUI', 'DITOLAK'].includes(status)) {
    return res.status(400).json({ error: 'Status harus DISETUJUI atau DITOLAK' });
  }
  try {
    const updated = await prisma.proposalKontrak.update({
      where: { id },
      data: {
        status,
        tanggalKeputusan: new Date(),
        catatanOwner,
      },
      include: { karyawan: true, createdByUser: true }
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    }
    res.status(500).json({ error: err.message });
  }
}; 