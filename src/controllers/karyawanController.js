const { PrismaClient } = require("@prisma/client");
const { calcRollingAvg, toGrade } = require("../utils/score.js");
const { generateKaryawanReportPDF } = require("../services/reportService.js");

const prisma = new PrismaClient();

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