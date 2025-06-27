// PASTIKAN BARIS INI ADA DI PALING ATAS
const prisma = require("../config/prismaClient");

const fs = require("fs-extra");
const path = require("path");
const PDFDocument = require("pdfkit");
const {
  sendCustomEmailWithAttachment,
  sendCustomEmail,
} = require("../services/emailService.js");
const { toGrade } = require("../utils/score.js");

// Variabel __dirname sudah tersedia secara otomatis di CommonJS, tidak perlu dibuat manual
function generateLaporanPDF(karyawan, nilaiRata) {
  const filename = `Laporan_Kinerja_${karyawan.nama.replace(/ /g, "_")}.pdf`;
  const publicDir = path.join(__dirname, "../../public");
  const filepath = path.join(publicDir, filename);

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filepath));

  doc.fontSize(18).text("Laporan Kinerja Karyawan", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Nama      : ${karyawan.nama}`);
  doc.text(`Posisi    : ${karyawan.posisi}`);
  doc.text(`Email     : ${karyawan.email}`);
  doc.text(`Rata-rata Skor: ${nilaiRata.toFixed(2)}`);
  doc.moveDown();
  doc.fillColor("red").text("Catatan:");
  doc
    .fillColor("black")
    .text(
      "Kinerja Anda masuk kategori kritis. Dengan berat hati, perusahaan memutuskan untuk mengakhiri kontrak kerja per tanggal hari ini."
    );

  doc.end();
  return filepath;
}

const kirimPemecatanMassal = async (req, res) => {
  try {
    const karyawanList = await prisma.karyawan.findMany();
    const result = [];

    for (const k of karyawanList) {
      const from = new Date();
      from.setMonth(from.getMonth() - 3);

      const penilaian = await prisma.penilaian.findMany({
        where: { karyawanId: k.id, createdAt: { gte: from } },
      });

      const rata2 =
        penilaian.reduce((a, b) => a + b.nilai, 0) / (penilaian.length || 1);
      const grade = toGrade(rata2);

      if (grade === "E" && k.email) {
        const pdfPath = generateLaporanPDF(k, rata2);
        await sendCustomEmailWithAttachment(
          k.email,
          k.nama,
          "pemecatan",
          pdfPath
        );

        result.push({ nama: k.nama, status: "Email dikirim" });
      }
    }

    res.json({ message: "Notifikasi pemecatan terkirim", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const kirimEmailKaryawan = async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
};

const kirimPeringatan = async (req, res) => {
  try {
    res.json({
      message: "Fitur kirim peringatan massal belum diimplementasikan.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// PASTIKAN BLOK INI ADA DI PALING BAWAH
module.exports = {
  kirimPemecatanMassal,
  kirimEmailKaryawan,
  kirimPeringatan,
};
