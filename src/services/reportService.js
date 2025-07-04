// src/services/reportService.js

// const PDFDocument = require("pdfkit"); // <-- Ganti baris ini
const PDFDocumentWithTables = require("pdfkit-table"); // <-- dengan baris ini
const { format } = require("date-fns");
const { toGrade } = require("../utils/score"); // <-- Impor fungsi toGrade

/**
 * Membuat buffer PDF untuk laporan kinerja seorang karyawan.
 * @param {object} karyawan - Objek karyawan lengkap dengan data penilaiannya.
 * @returns {Promise<Buffer>} - Buffer berisi data PDF.
 */
exports.generateKaryawanReportPDF = (karyawan) => {
  return new Promise((resolve) => {
    // Gunakan PDFDocumentWithTables
    const doc = new PDFDocumentWithTables({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // === ISI DOKUMEN PDF ===

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Laporan Kinerja Karyawan", { align: "center" });
    doc.moveDown();

    // Informasi Karyawan
    doc.fontSize(12).font("Helvetica");
    doc.text(`Nama: ${karyawan.nama}`);
    doc.text(`Posisi: ${karyawan.posisi}`);
    doc.text(`Email: ${karyawan.email || "-"}`);
    doc.text(
      `Tanggal Bergabung: ${format(
        new Date(karyawan.startDate),
        "dd MMMM yyyy"
      )}`
    );
    doc.moveDown(2);

    // Detail Penilaian per Bulan
    doc.fontSize(16).font("Helvetica-Bold").text("Detail Riwayat Penilaian");
    doc.moveDown();

    // Grouping penilaian berdasarkan bulan
    const penilaianPerBulan = {};
    karyawan.penilaian.forEach((p) => {
      const bulan = format(new Date(p.createdAt), "MMMM yyyy");
      if (!penilaianPerBulan[bulan]) {
        penilaianPerBulan[bulan] = [];
      }
      penilaianPerBulan[bulan].push(p);
    });

    // ==========================================================
    // BAGIAN YANG DIUBAH: DARI LIST MENJADI TABEL DAN GRADE
    // ==========================================================
    if (Object.keys(penilaianPerBulan).length === 0) {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Belum ada data penilaian yang tercatat.");
    } else {
      for (const bulan in penilaianPerBulan) {
        const assessments = penilaianPerBulan[bulan];
        
        // 1. Hitung rata-rata & grade untuk bulan ini
        const totalNilai = assessments.reduce((sum, p) => sum + p.nilai, 0);
        const avgNilai = totalNilai / assessments.length;
        const gradeBulan = toGrade(avgNilai);

        // 2. Siapkan data untuk tabel
        const table = {
          title: bulan, // Judul tabel adalah nama bulan
          headers: [
            { label: "Kriteria", width: 350 },
            { label: "Nilai", width: 100 },
          ],
          rows: assessments.map((p) => [
            p.kriteria.nama,
            p.nilai.toFixed(2),
          ]),
        };

        // 3. Gambar tabel menggunakan pdfkit-table
        // Periksa apakah ada cukup ruang untuk tabel berikutnya
        const tableHeightEstimate = assessments.length * 15 + 50; // Estimasi tinggi tabel (baris * tinggi_baris + tinggi_header)
        if (doc.y + tableHeightEstimate > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          doc.moveDown(); // Beri sedikit ruang di awal halaman baru
        }
        doc.table(table, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
          prepareRow: (row, indexColumn, indexRow, rectRow) =>
            doc.font("Helvetica").fontSize(10),
        });

        // 4. Tambahkan rekap di bawah tabel
        doc.font("Helvetica-Bold").text(`Rata-rata Bulan Ini: ${avgNilai.toFixed(2)}`);
        doc.text(`Grade Bulan Ini: ${gradeBulan}`);
        doc.moveDown(2); // Beri jarak sebelum tabel bulan berikutnya
      }
    }

    // Tandai akhir dari dokumen
    doc.end();
  });
};