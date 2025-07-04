const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const karyawanList = await prisma.karyawan.findMany();
  const kriteriaList = await prisma.kriteria.findMany();

  console.log(`Found ${karyawanList.length} Karyawan.`);
  console.log(`Found ${kriteriaList.length} Kriteria.`);

  let totalInserted = 0;

  for (let i = 0; i < karyawanList.length; i++) {
    const karyawan = karyawanList[i];
    let minScore, maxScore;

    if (i < 20) { // First 20 employees for Grade A
      minScore = 4.5;
      maxScore = 5.0;
    } else if (i < 40) { // Next 20 employees for Grade B
      minScore = 3.5;
      maxScore = 4.4;
    } else if (i < 60) { // Next 20 employees for Grade C
      minScore = 2.5;
      maxScore = 3.4;
    } else if (i < 80) { // Next 20 employees for Grade D
      minScore = 1.5;
      maxScore = 2.4;
    } else if (i < 95) { // Next 15 employees for Grade E
      minScore = 1.0;
      maxScore = 1.4;
    } else { // Remaining 5 employees for Grade N/A
      minScore = 0.5;
      maxScore = 0.9;
    }

    // Randomly determine months of data (3 to 12 months)
    const monthsToGenerate = Math.floor(Math.random() * (12 - 3 + 1)) + 3;
    const today = new Date();

    for (let j = 0; j < monthsToGenerate; j++) {
      const evaluationDate = new Date(
        today.getFullYear(),
        today.getMonth() - j,
        Math.floor(Math.random() * 28) + 1 // Random day of the month
      );

      for (const kriteria of kriteriaList) {
        const randomNilai = (Math.random() * (maxScore - minScore) + minScore).toFixed(2);

        await prisma.penilaian.create({
          data: {
            karyawanId: karyawan.id,
            kriteriaId: kriteria.id,
            nilai: parseFloat(randomNilai),
            createdAt: evaluationDate,
          },
        });
        totalInserted++;
      }
    }
  }

  console.log(`✅ Penilaian baru ditambahkan: ${totalInserted} entri`);
}

module.exports = { main };