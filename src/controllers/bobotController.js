// controllers/bobotController.js
const prisma = require("../config/prismaClient");

const { hitungSkor6Bulan } = require("../utils/skor");

/* -------- GET semua bobot -------- */
exports.getAllBobot = async (_req, res, next) => {
  try {
    const list = await prisma.bobotKriteria.findMany({
      include: { kriteria: true },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
};

/* -------- INSERT / UPDATE + normalisasi -------- */
exports.upsertBobot = async (req, res, next) => {
  const { kriteriaId, bobot } = req.body;
  if (!kriteriaId || bobot == null)
    return res.status(400).json({ msg: "field kurang" });

  try {
    /* upsert */
    await prisma.bobotKriteria.upsert({
      where: { kriteriaId },
      update: { bobot },
      create: { kriteriaId, bobot },
    });

    /* ambil semua bobot lalu normalisasi */
    const all = await prisma.bobotKriteria.findMany();
    const sum = all.reduce((acc, b) => acc + b.bobot, 0);
    await Promise.all(
      all.map((b) =>
        prisma.bobotKriteria.update({
          where: { id: b.id },
          data: { bobot: b.bobot / sum }, // normalisasi
        })
      )
    );

    /* hitung ulang skor setiap karyawan */
    const karyawanList = await prisma.karyawan.findMany({
      select: { id: true },
    });
    for (const k of karyawanList) {
      await hitungSkor6Bulan(k.id);
    }

    res.json({ msg: "Bobot tersimpan & ternormalisasi" });
  } catch (e) {
    next(e);
  }
};

/* -------- helper skor -------- */
async function hitungSkor(karyawanId) {
  const pen = await prisma.penilaian.findMany({
    where: { karyawanId },
    include: { kriteria: { include: { bobotKriteria: true } } },
  });
  const total = pen.reduce(
    (acc, p) => acc + p.nilai * (p.kriteria.bobotKriteria?.bobot || 0),
    0
  );
  await prisma.karyawan.update({
    where: { id: karyawanId },
    data: { skor: total },
  });
}
