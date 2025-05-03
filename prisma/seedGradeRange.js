/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* -------------------  CONFIG  ------------------- */
const TARGETS = [
  { nama: "Grade‑A", posisi: "Demo", avg: 4.5 },
  { nama: "Grade‑B", posisi: "Demo", avg: 3.5 },
  { nama: "Grade‑C", posisi: "Demo", avg: 2.5 },
  { nama: "Grade‑D", posisi: "Demo", avg: 1.5 },
  { nama: "Grade‑E", posisi: "Demo", avg: 0.5 },
];

// 3 kriteria default (pastikan tabel Kriteria sudah ada 3 baris)
const getKriteriaIds = async () =>
  (await prisma.kriteria.findMany({ select: { id: true } })).map((k) => k.id);

/* -------------------  SEED  ------------------- */
(async () => {
  /* truncate Penilaian & Karyawan demo */
  await prisma.penilaian.deleteMany();
  await prisma.karyawan.deleteMany({ where: { email: null } });

  const kriteriaIds = await getKriteriaIds();
  if (kriteriaIds.length < 3) throw new Error("butuh ≥3 kriteria");

  for (const t of TARGETS) {
    // 1️⃣  create karyawan
    const k = await prisma.karyawan.create({
      data: { nama: t.nama, posisi: t.posisi },
    });

    // 2️⃣  insert nilai 3 bulan ke belakang
    for (let m = 0; m < 3; m++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);

      for (const critId of kriteriaIds) {
        await prisma.penilaian.create({
          data: {
            karyawanId: k.id,
            kriteriaId: critId,
            nilai: t.avg, // pakai nilai yg sama biar avg persis
            createdAt: date,
          },
        });
      }
    }
  }

  console.log("✅  Seeded 5 karyawan grade A‑E");
  process.exit(0);
})();
