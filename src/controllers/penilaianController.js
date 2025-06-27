const prisma = require("../config/prismaClient");
const { hitungSkor6Bulan } = require("../utils/skor");

// Ambil semua penilaian (tanpa filter)
exports.getAllPenilaian = async (req, res) => {
  try {
    const data = await prisma.penilaian.findMany({
      include: {
        karyawan: true,
        kriteria: true,
      },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* -------------------  CREATE / UPDATE PER‑BULAN  ------------------- */
exports.upsertPenilaian = async (req, res, next) => {
  const { karyawanId, kriteriaId, nilai, bulan } = req.body;

  if (!karyawanId || !kriteriaId || nilai == null || !bulan)
    return res.status(400).json({ msg: "field kurang" });

  // contoh "2025-05" -> date 1 Mei 2025
  const periodStart = new Date(`${bulan}-01T00:00:00.000Z`);
  const periodEnd = new Date(
    new Date(periodStart).setMonth(periodStart.getMonth() + 1)
  );

  try {
    const existing = await prisma.penilaian.findFirst({
      where: {
        karyawanId,
        kriteriaId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    });
    await hitungSkor6Bulan(karyawanId);
    let penilaian;
    if (existing) {
      penilaian = await prisma.penilaian.update({
        where: { id: existing.id },
        data: { nilai },
      });
    } else {
      penilaian = await prisma.penilaian.create({
        data: { karyawanId, kriteriaId, nilai, createdAt: periodStart },
      });
    }

    res.json(penilaian);
  } catch (err) {
    next(err);
  }
};

// Hapus penilaian
exports.deletePenilaian = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.penilaian.delete({ where: { id } });
    res.json({ message: "Penilaian berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOverview = async (req, res, next) => {
  const id = Number(req.params.karyawanId);
  if (Number.isNaN(id)) return res.status(400).json({ msg: "ID invalid" });

  try {
    /* --- ambil meta karyawan --- */
    const karyawan = await prisma.karyawan.findUnique({
      where: { id },
      select: { nama: true, startDate: true },
    });

    /* 1️⃣  Rekap bulanan sejak startDate */
    const monthly = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month',"createdAt") AS period,
             ROUND(AVG("nilai")::numeric,2)  AS avg_nilai
      FROM "Penilaian"
      WHERE "karyawanId" = ${id}
      GROUP BY 1 ORDER BY 1;`;

    /* 2️⃣  Rekap kuartalan */
    const quarterly = await prisma.$queryRaw`
      SELECT DATE_TRUNC('quarter',"createdAt") AS period,
             ROUND(AVG("nilai")::numeric,2)    AS avg_nilai
      FROM "Penilaian"
      WHERE "karyawanId" = ${id}
      GROUP BY 1 ORDER BY 1;`;

    /* 3️⃣  Rekap tahunan */
    const yearly = await prisma.$queryRaw`
      SELECT DATE_TRUNC('year',"createdAt") AS period,
             ROUND(AVG("nilai")::numeric,2)  AS avg_nilai
      FROM "Penilaian"
      WHERE "karyawanId" = ${id}
      GROUP BY 1 ORDER BY 1;`;

    /* --- bikin kesimpulan simpel --- */
    const now = new Date();
    const tenureMonths = Math.floor(
      (now - karyawan.startDate) / (1000 * 60 * 60 * 24 * 30)
    );
    const latestScore = monthly.at(-1)?.avg_nilai ?? 0;

    let verdict = "Performa stabil.";
    if (latestScore >= 4)
      verdict = "Kinerja sangat baik, layak dipertimbangkan naik gaji/pangkat.";
    else if (latestScore < 2.5)
      verdict = "Kinerja perlu ditingkatkan, pertimbangkan coaching.";

    res.json({
      karyawan: karyawan.nama,
      mulaiKerja: karyawan.startDate,
      masaKerjaBulan: tenureMonths,
      monthly,
      quarterly,
      yearly,
      kesimpulan: verdict,
    });
  } catch (err) {
    next(err);
  }
};

exports.getRanking = async (req, res) => {
  try {
    const bobotKriteria = await prisma.bobotKriteria.findMany();
    const bobotMap = {};
    bobotKriteria.forEach((b) => {
      bobotMap[b.kriteriaId] = b.bobot;
    });

    const karyawan = await prisma.karyawan.findMany({
      include: { penilaian: true },
    });

    const ranking = karyawan.map((k) => {
      let total = 0;
      k.penilaian.forEach((p) => {
        const bobot = bobotMap[p.kriteriaId] || 0;
        total += p.nilai * bobot;
      });
      return {
        id: k.id,
        nama: k.nama,
        posisi: k.posisi,
        totalSkor: total,
      };
    });

    ranking.sort((a, b) => b.totalSkor - a.totalSkor);
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
