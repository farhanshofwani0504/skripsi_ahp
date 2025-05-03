import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendCustomEmail = async (to, nama, jenisEmail) => {
  const lowerCaseJenis = jenisEmail.toLowerCase(); // Biar aman

  let subject = "";
  let text = "";

  if (lowerCaseJenis === "peringatan") {
    subject = "Peringatan Kinerja";
    text = `Halo ${nama},\n\nKami mengingatkan bahwa kinerja Anda perlu diperbaiki. Segera tingkatkan performa Anda.`;
  } else if (lowerCaseJenis === "peningkatan") {
    subject = "Peningkatan Diharapkan";
    text = `Halo ${nama},\n\nKinerja Anda cukup baik, namun masih ada ruang untuk peningkatan. Terus semangat!`;
  } else if (lowerCaseJenis === "pujian") {
    subject = "Selamat atas Kinerja Anda!";
    text = `Halo ${nama},\n\nKami mengapresiasi kinerja Anda yang luar biasa. Terus pertahankan prestasi ini!`;
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
export const sendCustomEmailWithAttachment = async (
  to,
  nama,
  jenisEmail,
  attachmentPath
) => {
  let subject = "Surat Pemecatan";
  let text = `Halo ${nama},\n\nBerdasarkan evaluasi kinerja 3 bulan terakhir, Anda mendapat skor yang sangat rendah.\nMohon lihat lampiran untuk informasi lebih lanjut.\n\nTerima kasih.`;

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
