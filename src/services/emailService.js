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
  if (!options.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
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

exports.sendCustomEmail = async (to, nama, jenisEmail) => {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn(`Peringatan: Tidak dapat mengirim email kustom. Alamat email tidak valid atau kosong: ${to}`);
    return; // Jangan lanjutkan jika email tidak valid
  }
  const lowerCaseJenis = jenisEmail.toLowerCase(); // Biar aman

  let subject = "";
  let text = "";

  if (lowerCaseJenis === "peringatan") {
    subject = "Peringatan Kinerja";
    text = `Halo ${nama},

Kami mengingatkan bahwa kinerja Anda perlu diperbaiki. Segera tingkatkan performa Anda.`;
  } else if (lowerCaseJenis === "peningkatan") {
    subject = "Peningkatan Diharapkan";
    text = `Halo ${nama},

Kinerja Anda cukup baik, namun masih ada ruang untuk peningkatan. Terus semangat!`;
  } else if (lowerCaseJenis === "pujian") {
    subject = "Selamat atas Kinerja Anda!";
    text = `Halo ${nama},

Kami mengapresiasi kinerja Anda yang luar biasa. Terus pertahankan prestasi ini!`;
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
  attachmentPath
) => {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn(`Peringatan: Tidak dapat mengirim email dengan lampiran. Alamat email tidak valid atau kosong: ${to}`);
    return; // Jangan lanjutkan jika email tidak valid
  }

  let subject = "";
  let text = "";

  if (jenisEmail.toLowerCase() === "pemecatan") {
    subject = "Pemberitahuan Pemutusan Hubungan Kerja";
    text = `Dengan Hormat ${nama},

Berdasarkan evaluasi kinerja selama 3 bulan terakhir, Anda mendapatkan skor rata-rata yang masuk dalam kategori sangat rendah.
Sehubungan dengan hal tersebut, kami memberitahukan bahwa hubungan kerja Anda akan berakhir.

Untuk informasi lebih detail, silakan merujuk pada dokumen yang terlampir.

Terima kasih atas kontribusi Anda selama ini.

Hormat kami,
Tim HRD`;
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
};

