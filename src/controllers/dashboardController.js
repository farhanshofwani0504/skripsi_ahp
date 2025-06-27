const prisma = require("../config/prismaClient");

// =================================
// Fungsi 1: Kesimpulan Global
// =================================
exports.getKesimpulanGlobal = async (req, res) => {
  try {
    const data = await prisma.penilaian.findMany({
      include: { kriteria: true },
    });

    // FIX: Tambahkan pengecekan ini untuk menangani kasus tidak ada data
    if (data.length === 0) {
      return res.json({
        kesimpulan: "Belum ada data penilaian untuk membuat kesimpulan.",
        detail: [],
      });
    }

    const totalKriteria = {};

    data.forEach((p) => {
      const nama = p.kriteria.nama;
      totalKriteria[nama] = (totalKriteria[nama] || 0) + p.nilai;
    });

    const result = Object.entries(totalKriteria).sort((a, b) => b[1] - a[1]);
    const [tertinggi] = result;

    res.json({
      kesimpulan: `Secara umum, karyawan lebih menonjol di ${tertinggi[0]}.`,
      detail: result.map(([kriteria, total]) => ({ kriteria, total })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =================================
// Fungsi 2: Skor Total Karyawan
// =================================
exports.getSkorKaryawan = async (req, res) => {
  try {
    const karyawanList = await prisma.karyawan.findMany({
      include: {
        penilaian: {
          include: {
            kriteria: {
              include: {
                bobotKriteria: true,
              },
            },
          },
        },
      },
    });

    const hasil = karyawanList.map((k) => {
      let total = 0;
      k.penilaian.forEach((p) => {
        const bobot = p.kriteria.bobotKriteria?.bobot || 0;
        total += p.nilai * bobot;
      });

      return {
        id: k.id,
        nama: k.nama,
        posisi: k.posisi,
        totalSkor: total,
      };
    });

    res.json(hasil);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =================================
// Fungsi 3: (Opsional) Ringkasan Bulanan
// =================================
exports.getRingkasanBulanan = async (req, res) => {
  try {
    // Disiapkan nanti kalau mau tambah laporan bulanan
    res.json({ message: "Fitur ringkasan bulanan belum dibuat." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
