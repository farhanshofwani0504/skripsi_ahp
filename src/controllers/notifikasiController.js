const prisma = require("../config/prismaClient");
const { sendCustomEmail } = require("../services/emailService");

exports.kirimEmailKaryawan = async (req, res) => {
  const { karyawanId, jenisEmail } = req.body;

  try {
    const karyawan = await prisma.karyawan.findUnique({
      where: { id: karyawanId },
    });

    if (!karyawan || !karyawan.email) {
      return res
        .status(404)
        .json({ error: "Karyawan atau email tidak ditemukan" });
    }

    await sendCustomEmail(karyawan.email, karyawan.nama, jenisEmail);

    res.json({
      message: `Email ${jenisEmail} berhasil dikirim ke ${karyawan.nama}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.kirimPeringatan = async (req, res) => {
  try {
    res.json({
      message: "Fitur kirim peringatan massal belum diimplementasikan.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
