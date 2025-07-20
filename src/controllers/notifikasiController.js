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

const kirimNotifikasiMassal = async (req, res) => {
  try {
    const karyawanList = await prisma.karyawan.findMany({
      include: {
        penilaian: {
          include: {
            kriteria: { select: { nama: true } },
          },
        },
      },
    });
    const result = [];

    for (const k of karyawanList) {
      const from = new Date();
      from.setMonth(from.getMonth() - 3);

      const penilaian = k.penilaian.filter(p => new Date(p.createdAt) >= from);

      const rata2 =
        penilaian.reduce((a, b) => a + b.nilai, 0) / (penilaian.length || 1);
      const grade = toGrade(rata2);

      if (grade === "D" && k.email) {
        const pdfPath = generateLaporanPDF(k, rata2); // Ganti dengan nama owner yang sebenarnya
        await sendCustomEmail(k.email, k.nama, "peringatan", penilaian);
        result.push({ nama: k.nama, status: "Email peringatan terkirim" });
      } else if (grade === "E" && k.email) {
        const pdfPath = generateLaporanPDF(k, rata2); // Ganti dengan nama owner yang sebenarnya
        await sendCustomEmailWithAttachment(
          k.email,
          k.nama,
          "pemecatan",
          pdfPath,
          penilaian,
          "[Nama Owner/HRD]" // Ganti dengan nama owner yang sebenarnya
        );
        result.push({ nama: k.nama, status: "Email pemecatan terkirim" });
      }
    }

    res.json({ message: "Notifikasi pemecatan selesai", data: result });
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

    if (!karyawan || !karyawan.email || karyawan.email.trim() === "") {
      return res
        .status(404)
        .json({ error: "Karyawan tidak ditemukan atau tidak memiliki alamat email yang valid" });
    }

    const from = new Date();
    from.setMonth(from.getMonth() - 3);

    const penilaian = await prisma.penilaian.findMany({
      where: { karyawanId: karyawan.id, createdAt: { gte: from } },
    });

    const rata2 =
      penilaian.reduce((a, b) => a + b.nilai, 0) / (penilaian.length || 1);

    await sendCustomEmail(karyawan.email, karyawan.nama, jenisEmail, penilaian);

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
  kirimNotifikasiMassal: kirimNotifikasiMassal,
  kirimEmailKaryawan,
  kirimPeringatan,
};
