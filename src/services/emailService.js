const nodemailer = require("nodemailer");
const path = require("path");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendEmail = async (options) => {
  if (!options.email || !/^[^@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
    console.warn(`Peringatan: Tidak dapat mengirim email. Alamat email tidak valid atau kosong: ${options.email}`);
    return; // Jangan lanjutkan jika email tidak valid
  }
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendCustomEmail = async (to, nama, jenisEmail, penilaianData = null) => {
  if (!to || !/^[^@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn(`Peringatan: Tidak dapat mengirim email kustom. Alamat email tidak valid atau kosong: ${to}`);
    return; // Jangan lanjutkan jika email tidak valid
  }
  const lowerCaseJenis = jenisEmail.toLowerCase(); // Biar aman

  let subject = "";
  let text = "";
  let penilaianDetailText = "";

  if (penilaianData && penilaianData.length > 0) {
    penilaianDetailText = "\n\nDetail Penilaian:";
    penilaianData.forEach((p) => {
      const date = new Date(p.createdAt).toLocaleDateString('id-ID');
      penilaianDetailText += `\n- Tanggal: ${date}, Nilai: ${p.nilai}`;
    });
    const rata2 = penilaianData.reduce((a, b) => a + b.nilai, 0) / penilaianData.length;
    penilaianDetailText += `\nNilai rata-rata: ${rata2.toFixed(2)}.`;
  }

  if (lowerCaseJenis === "peringatan") {
    subject = "Peringatan Kinerja";
    text = `Halo ${nama},\n\nKami mengingatkan bahwa kinerja Anda perlu diperbaiki. Segera tingkatkan performa Anda.${penilaianDetailText}`;
  } else if (lowerCaseJenis === "peningkatan") {
    subject = "Peningkatan Diharapkan";
    text = `Halo ${nama},\n\nKinerja Anda cukup baik, namun masih ada ruang untuk peningkatan. Terus semangat!${penilaianDetailText}`;
  } else if (lowerCaseJenis === "pujian") {
    subject = "Selamat atas Kinerja Anda!";
    text = `Halo ${nama},\n\nKami mengapresiasi kinerja Anda yang luar biasa. Terus pertahankan prestasi ini!${penilaianDetailText}`;
  } else {
    throw new Error("Jenis email tidak valid"); // error kalau jenis salah
  }

  await transporter.sendMail({
    from: '"HRD Team" <noreply@example.com>',
    to,
    subject,
    text,
  });
};

// Kirim email dengan lampiran
exports.sendCustomEmailWithAttachment = async (
  to,
  nama,
  jenisEmail,
  attachmentPath,
  penilaianData = [],
  ownerName = "Tim HRD"
) => {
  if (!to || !/^[^@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn(`Peringatan: Tidak dapat mengirim email dengan lampiran. Alamat email tidak valid atau kosong: ${to}`);
    return; // Jangan lanjutkan jika email tidak valid
  }

  let subject = "";
  let text = "";
  let penilaianDetailText = "";
  let totalNilai = 0;
  let rata2Nilai = 0;

  if (penilaianData && penilaianData.length > 0) {
    penilaianDetailText = "\n\nDetail Penilaian:";
    penilaianData.forEach((p) => {
      const date = new Date(p.createdAt).toLocaleDateString('id-ID');
      penilaianDetailText += `\n- Tanggal: ${date}, Kriteria: ${p.kriteria.nama}, Nilai: ${p.nilai}`;
      totalNilai += p.nilai;
    });
    rata2Nilai = totalNilai / penilaianData.length;
    penilaianDetailText += `\n\nTotal Nilai: ${totalNilai.toFixed(2)}`;
    penilaianDetailText += `\nRata-rata Nilai: ${rata2Nilai.toFixed(2)}.`;
  }

  const currentDate = new Date().toLocaleDateString('id-ID');

  if (jenisEmail.toLowerCase() === "pemecatan") {
    subject = "Pemberitahuan Pemutusan Hubungan Kerja";
    text = `Dengan Hormat ${nama},

Berdasarkan evaluasi kinerja selama 3 bulan terakhir, Anda mendapatkan skor rata-rata yang masuk dalam kategori sangat rendah. Berikut adalah rincian penilaian Anda:${penilaianDetailText}

Sehubungan dengan hal tersebut, kami memberitahukan bahwa hubungan kerja Anda akan berakhir per tanggal ${currentDate}.

Untuk informasi lebih detail, silakan merujuk pada dokumen yang terlampir.

Terima kasih atas kontribusi Anda selama ini.

Hormat kami,
${ownerName}`;
  } else {
    // Opsi untuk menangani jenis email lain jika diperlukan di masa depan
    console.warn(`Jenis email "${jenisEmail}" tidak didukung untuk pengiriman dengan lampiran.`);
    return;
  }

  await transporter.sendMail({
    from: '"HRD Team" <noreply@example.com>',
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(attachmentPath),
        path: attachmentPath,
      },
    ],
  });
}
