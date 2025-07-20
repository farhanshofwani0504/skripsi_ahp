const { PrismaClient } = require("@prisma/client");
const { calcRollingAvg, toGrade } = require("../utils/score.js");
const { generateKaryawanReportPDF } = require("../services/reportService.js");
const { sendCustomEmailWithAttachment } = require("../services/emailService.js");
const fs = require("fs-extra");
const path = require("path");
const PDFDocument = require("pdfkit");
const PDFTable = require('pdfkit-table');
const { parse } = require('csv-parse');

const prisma = new PrismaClient();

// Function to generate PDF for termination letter
function generateTerminationLetterPDF(karyawan, penilaianData, ownerName = "Tim HRD") {
  const filename = `Surat_Pemutusan_Hubungan_Kerja_${karyawan.nama.replace(/ /g, "_")}.pdf`;
  const publicDir = path.join(__dirname, "../../public");
  const filepath = path.join(publicDir, filename);

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filepath));

  doc.fontSize(18).text("SURAT PEMECATAN KARYAWAN", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Kepada Yth. Sdr/i ${karyawan.nama},

Dengan hormat,

Berdasarkan evaluasi kinerja yang telah dilakukan selama 3 bulan terakhir, kami menemukan bahwa kinerja Anda berada pada kategori sangat rendah. Rincian penilaian kinerja Anda adalah sebagai berikut:`);
  doc.moveDown();

  doc.fontSize(14).text("Berikut adalah rincian nilai mentah dari setiap penilaian:");
  doc.moveDown(0.5);
  let totalNilai = 0;
  if (penilaianData && penilaianData.length > 0) {
    penilaianData.forEach((p) => {
      const date = new Date(p.createdAt).toLocaleDateString('id-ID');
      doc.text(`- Tanggal: ${date}, Kriteria: ${p.kriteria.nama}, Nilai: ${p.nilai}`);
      totalNilai += p.nilai;
    });
    const rata2Nilai = totalNilai / penilaianData.length;
    doc.text(`\nTotal Nilai: ${totalNilai.toFixed(2)}`);
    doc.text(`Rata-rata Nilai: ${rata2Nilai.toFixed(2)}`);
  } else {
    doc.text("Tidak ada data penilaian yang tersedia.");
  }

  doc.moveDown();
  doc.text("Sehubungan dengan hal tersebut, dengan berat hati kami memberitahukan bahwa hubungan kerja Anda dengan perusahaan akan berakhir per tanggal hari ini.");
  doc.moveDown();
  doc.text("Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Anda selama ini, kami ucapkan terima kasih.");

  doc.moveDown();
  doc.text(`Hormat kami,\n\n(Tanda Tangan HRD/Owner)\n\n${ownerName}, ${new Date().toLocaleDateString('id-ID')}`);

  doc.end();
  return filepath;
}

/* ---------- GET /api/karyawan ---------- */
exports.getAllKaryawan = async (_req, res, next) => {
  try {
    const list = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });

    const data = await Promise.all(
      list.map(async (k) => {
        const avg3m = await calcRollingAvg(prisma, k.id);
        return { ...k, rollingAvg: avg3m, grade: toGrade(avg3m) };
      })
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getKaryawanById = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });

  try {
    const k = await prisma.karyawan.findUnique({ where: { id } });
    if (!k)
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });

    const avg3m = await calcRollingAvg(prisma, id);
    res.json({ ...k, rollingAvg: avg3m, grade: toGrade(avg3m) });
  } catch (err) {
    next(err);
  }
};

exports.getKaryawanPenilaian = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID karyawan tidak valid" });

  try {
    const karyawan = await prisma.karyawan.findUnique({
      where: { id },
      include: {
        penilaian: {
          orderBy: { createdAt: "asc" },
          include: {
            kriteria: { select: { nama: true } }, // Include kriteria nama for each penilaian
          },
        },
      },
    });

    if (!karyawan) {
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    }

    res.json(karyawan);
  } catch (err) {
    next(err);
  }
};

/* ---------- POST /api/karyawan ---------- */
exports.addKaryawan = async (req, res, next) => {
  const { nama, posisi, email } = req.body;
  if (!nama || !posisi)
    return res.status(400).json({ message: "nama & posisi wajib diisi" });

  try {
    const newKaryawan = await prisma.karyawan.create({
      data: { nama, posisi, email: email || null },
    });
    res.status(201).json(newKaryawan);
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("email"))
      return res.status(409).json({ message: "email sudah dipakai" });
    next(err);
  }
};

/* ---------- DELETE /api/karyawan/:id ---------- */
exports.deleteKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });

  try {
    await prisma.karyawan.delete({ where: { id } }); // FK sudah cascade
    res.json({ message: `karyawan #${id} terhapus ✅` });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "karyawan tidak ditemukan" });
    next(err);
  }
};

/* ---------- PATCH /api/karyawan/:id ---------- */
exports.updateKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  const { nama, posisi, email } = req.body;

  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });
  if (!nama && !posisi && !email)
    return res.status(400).json({ message: "Tidak ada field di‑update" });

  try {
    const updated = await prisma.karyawan.update({
      where: { id },
      data: {
        ...(nama && { nama }),
        ...(posisi && { posisi }),
        ...(email && { email }),
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("email"))
      return res.status(409).json({ message: "Email sudah dipakai" });
    if (err.code === "P2025")
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    next(err);
  }
};


exports.downloadLaporanKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID karyawan tidak valid" });
  }

  try {
    // 1. Ambil data karyawan beserta semua penilaiannya
    const karyawan = await prisma.karyawan.findUnique({
      where: { id },
      include: {
        penilaian: {
          orderBy: { createdAt: "asc" }, // Urutkan dari yang paling lama
          include: {
            kriteria: { select: { nama: true } },
          },
        },
      },
    });

    // 2. Handle jika karyawan tidak ditemukan
    if (!karyawan) {
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    }

    // 3. Panggil service untuk membuat PDF dalam bentuk buffer
    const pdfBuffer = await generateKaryawanReportPDF(karyawan);

    // 4. Atur header response untuk men-trigger download file di browser
    const filename = `Laporan_Kinerja_${karyawan.nama.replace(/ /g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 5. Kirim buffer PDF sebagai respons
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

exports.downloadGradesExcel = async (_req, res, next) => {
  try {
    const list = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });

    const data = await Promise.all(
      list.map(async (k) => {
        const avg3m = await calcRollingAvg(prisma, k.id);
        return { 
          nama: k.nama,
          posisi: k.posisi,
          email: k.email || '-',
          rollingAvg: avg3m.toFixed(2),
          grade: toGrade(avg3m) 
        };
      })
    );

    // Create CSV header
    const csvHeader = "Nama,Posisi,Email,Rata-rata Nilai,Grade\n";

    // Create CSV rows
    const csvRows = data.map(row => 
      `"${row.nama}","${row.posisi}","${row.email}","${row.rollingAvg}","${row.grade}"`
    ).join("\n");

    const csvContent = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"laporan_grade_karyawan.csv\"");
    res.send(csvContent);

  } catch (err) {
    next(err);
  }
};

exports.downloadRawScoresExcel = async (_req, res, next) => {
  try {
    const penilaianData = await prisma.penilaian.findMany({
      include: {
        karyawan: { select: { nama: true, posisi: true, email: true } },
        kriteria: { select: { nama: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Create CSV header
    const csvHeader = "Nama Karyawan,Posisi,Email,Nama Kriteria,Nilai,Tanggal Penilaian\n";

    // Create CSV rows
    const csvRows = penilaianData.map(p => {
      const tanggal = p.createdAt ? p.createdAt.toISOString().split('T')[0] : '';
      return `"${p.karyawan.nama}","${p.karyawan.posisi}","${p.karyawan.email || '-'}","${p.kriteria.nama}","${p.nilai}","${tanggal}"`;
    }).join("\n");

    const csvContent = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"laporan_nilai_mentah.csv\"");
    res.send(csvContent);

  } catch (err) {
    next(err);
  }
};





// Fungsi generate rekap global semua karyawan dalam bentuk PDF
exports.generateRekapGlobalPDF = async (req, res, next) => {
  try {
    const ownerName = req.query.owner || "Tim HRD";
    const filename = `Rekap_Kesimpulan_Global.pdf`;
    const publicDir = path.join(__dirname, "../../public");
    const filepath = path.join(publicDir, filename);

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Ambil data karyawan & grade
    const karyawanList = await prisma.karyawan.findMany({ orderBy: { nama: "asc" } });
    const data = await Promise.all(
      karyawanList.map(async (k) => {
        const avg3m = await calcRollingAvg(prisma, k.id);
        const grade = toGrade(avg3m);
        const keterangan = ["A", "B", "C"].includes(grade) ? "Layak" : "Tidak Layak";
        return {
          nama: k.nama,
          posisi: k.posisi,
          grade,
          keterangan,
          skor: avg3m.toFixed(2)
        };
      })
    );

    const doc = new PDFDocument({ margin: 60 }); // margin lebih lebar
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    doc.pipe(res);

    doc.fontSize(16).text("REKAP KESIMPULAN GLOBAL KARYAWAN", { align: "center", underline: true });
    doc.moveDown(1);

    // Tabel manual dengan monospace dan padding
    doc.font('Courier-Bold').fontSize(10);
    const header = `${'Nama'.padEnd(21)}${'Divisi'.padEnd(26)}${'Skor'.padEnd(8)}${'Grade'.padEnd(8)}${'Keterangan'.padEnd(12)}`;
    doc.text(header);
    // Garis bawah header
    const y = doc.y;
    doc.moveTo(doc.page.margins.left, y + 2).lineTo(doc.page.width - doc.page.margins.right, y + 2).stroke();
    doc.moveDown(0.4);
    doc.font('Courier').fontSize(10);
    data.forEach(row => {
      const nama = row.nama.slice(0, 20).padEnd(21);
      const posisi = row.posisi.slice(0, 25).padEnd(26);
      const skor = row.skor.padEnd(8);
      const grade = row.grade.padEnd(8);
      const keterangan = row.keterangan.padEnd(12);
      const line = `${nama}${posisi}${skor}${grade}${keterangan}`;
      doc.text(line);
      doc.moveDown(0.2);
    });
    console.log('Loop data selesai, lanjut tanda tangan');
    doc.moveDown(3);
    doc.text(`Mengetahui,`, { align: "right" });
    doc.moveDown(2.5);
    doc.text(`${ownerName}`, { align: "right" });
    doc.text(`${new Date().toLocaleDateString('id-ID')}`, { align: "right" });
    console.log('Tanda tangan selesai, sebelum doc.end()');
    doc.end();
    console.log('doc.end() dipanggil, response akan otomatis terkirim');

  } catch (err) {
    next(err);
  }
};

/**
 * Import data karyawan dari file CSV
 * Format CSV:
 * nama,posisi,email
 * Budi,Staff,budi@email.com
 * Siti,Manager,siti@email.com
 */
exports.importCsvKaryawan = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'File CSV tidak ditemukan' });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      try {
        for (const row of results) {
          if (!row.nama || !row.posisi) continue;
          await prisma.karyawan.create({
            data: {
              nama: row.nama,
              posisi: row.posisi,
              email: row.email || null
            }
          });
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import karyawan selesai', count: results.length });
      } catch (err) {
        next(err);
      }
    })
    .on('error', (err) => next(err));
};

/**
 * Import data nilai karyawan dari file CSV
 * Format CSV:
 * karyawan_email,kriteria,nilai,tanggal
 * budi@email.com,Disiplin,3.5,2024-07-01
 * siti@email.com,Produktivitas,4.0,2024-07-01
 */
exports.importCsvNilai = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'File CSV tidak ditemukan' });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      try {
        for (const row of results) {
          if (!row.karyawan_email || !row.kriteria || !row.nilai) continue;
          // Cari karyawan by email
          const karyawan = await prisma.karyawan.findUnique({ where: { email: row.karyawan_email } });
          if (!karyawan) continue;
          // Cari kriteria by nama
          const kriteria = await prisma.kriteria.findFirst({ where: { nama: row.kriteria } });
          if (!kriteria) continue;
          await prisma.penilaian.create({
            data: {
              karyawanId: karyawan.id,
              kriteriaId: kriteria.id,
              nilai: parseFloat(row.nilai),
              createdAt: row.tanggal ? new Date(row.tanggal) : new Date()
            }
          });
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import nilai karyawan selesai', count: results.length });
      } catch (err) {
        next(err);
      }
    })
    .on('error', (err) => next(err));
};

/**
 * Review kelayakan perpanjangan kontrak karyawan
 * Endpoint: GET /karyawan/:id/review-perpanjangan
 * Response: rata-rata nilai, grade, rekomendasi, histori kontrak (dummy)
 */
exports.reviewPerpanjanganKontrak = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });
  try {
    // Dummy: histori kontrak, asumsikan kontrak terakhir berakhir 6 bulan lalu
    // (Nanti bisa diambil dari tabel kontrak jika sudah ada)
    const lastContractEndDate = null; // new Date('2024-01-01')
    // Ambil semua penilaian sejak kontrak terakhir (atau semua jika null)
    const where = { karyawanId: id };
    if (lastContractEndDate) where.createdAt = { gte: lastContractEndDate };
    const penilaianList = await prisma.penilaian.findMany({ where });
    // Hitung rata-rata
    let avg = 0;
    if (penilaianList.length) {
      avg = penilaianList.reduce((sum, p) => sum + p.nilai, 0) / penilaianList.length;
    }
    const grade = toGrade(avg);
    const rekomendasi = ["A", "B", "C"].includes(grade) ? "Layak diperpanjang" : "Tidak layak diperpanjang";
    res.json({
      rataRata: avg,
      grade,
      rekomendasi,
      totalPenilaian: penilaianList.length,
      historiKontrak: [
        // Dummy histori, nanti bisa diambil dari tabel kontrak
        { mulai: "2023-01-01", akhir: "2024-01-01", status: "Selesai" }
      ]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Kirim email pemecatan ke karyawan
 * Endpoint: POST /karyawan/:id/pemecatan
 * Response: message, karyawanId
 */
exports.pemecatanKaryawanById = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID karyawan tidak valid" });
  }

  try {
    const karyawan = await prisma.karyawan.findUnique({
      where: { id },
      include: {
        penilaian: {
          orderBy: { createdAt: "asc" },
          include: {
            kriteria: { select: { nama: true } },
          },
        },
      },
    });

    if (!karyawan) {
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    }

    if (!karyawan.email) {
      return res.status(400).json({ message: "Karyawan tidak memiliki alamat email yang valid untuk pengiriman notifikasi." });
    }

    const ownerName = req.body.ownerName || "[Nama Owner/HRD]";
    const pdfPath = await generateKaryawanReportPDF(karyawan, karyawan.penilaian, ownerName);

    await sendCustomEmailWithAttachment(
      karyawan.email,
      karyawan.nama,
      "pemecatan",
      pdfPath,
      karyawan.penilaian,
      ownerName
    );

    res.json({
      message: `Email pemecatan berhasil dikirim ke ${karyawan.nama}`,
      karyawanId: id,
    });
  } catch (err) {
    next(err);
  }
};