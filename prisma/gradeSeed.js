// prisma/gradeSeed.js  (CommonJS supaya nggak ribet ESM)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const THRESHOLD_MIN = 1;
const THRESHOLD_MAX = 5;
const randScore = () =>
  Number(
    (Math.random() * (THRESHOLD_MAX - THRESHOLD_MIN) + THRESHOLD_MIN).toFixed(2)
  );

const last3Months = () => {
  const arr = [];
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    arr.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
  }
  return arr;
};

(async () => {
  /* 1️⃣  Bersihin tabel Penilaian (optional: WHERE ... kalau mau selektif) */
  await prisma.penilaian.deleteMany({});
  console.log("🗑️  Penilaian table truncated");

  /* 2️⃣  Ambil data master */
  const karyawan = await prisma.karyawan.findMany();
  const kriteria = await prisma.kriteria.findMany();
  const months = last3Months();

  /* 3️⃣  Seed */
  const ops = [];
  for (const k of karyawan) {
    for (const c of kriteria) {
      months.forEach((date) =>
        ops.push(
          prisma.penilaian.create({
            data: {
              karyawanId: k.id,
              kriteriaId: c.id,
              nilai: randScore(),
              createdAt: date,
            },
          })
        )
      );
    }
  }

  console.log(
    `Seeding ${ops.length} baris Penilaian (${karyawan.length} karyawan × ${kriteria.length} kriteria × 3 bulan)`
  );
  await prisma.$transaction(ops);

  console.log("✅  Done seeding.");
  process.exit(0);
})();
