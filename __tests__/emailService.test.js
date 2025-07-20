// Siapkan fungsi mock yang akan kita gunakan untuk sendMail SEBELUM semuanya
const mockSendMail = jest.fn();

// Mock modul 'nodemailer' menggunakan factory function untuk mengontrol implementasinya.
// Ini memastikan bahwa setiap kali 'nodemailer' di-require, ia akan memiliki bentuk ini.
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

// SEKARANG baru impor fungsi yang akan diuji, SETELAH mock didefinisikan
const {
  sendCustomEmail,
  sendCustomEmailWithAttachment,
} = require("../src/services/emailService.js");

// Impor path hanya jika diperlukan, di dalam tes
const path = require("path");

describe("Email Service", () => {
  beforeEach(() => {
    // Bersihkan semua histori mock sebelum setiap tes
    mockSendMail.mockClear();
  });

  // --- Tes untuk sendCustomEmail ---
  describe("sendCustomEmail", () => {
    test('harus mengirim email "peringatan" dengan subjek dan teks yang benar', async () => {
      mockSendMail.mockResolvedValue(); // Asumsikan pengiriman email berhasil
      await sendCustomEmail("test@example.com", "Budi", "peringatan");

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Peringatan Kinerja",
          text: expect.stringContaining("Halo Budi"),
        })
      );
    });

    test('harus mengirim email "pujian" dengan subjek dan teks yang benar', async () => {
      mockSendMail.mockResolvedValue();
      await sendCustomEmail("test@example.com", "Ani", "pujian");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Selamat atas Kinerja Anda!",
          text: expect.stringContaining("mengapresiasi kinerja Anda"),
        })
      );
    });

    test("harus melempar error jika jenisEmail tidak valid", async () => {
      // Kita harapkan fungsi ini akan gagal (rejects) karena jenis emailnya salah
      await expect(
        sendCustomEmail("test@example.com", "Cici", "jenis_salah")
      ).rejects.toThrow("Jenis email tidak valid");

      // Pastikan sendMail tidak pernah dipanggil
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  // --- Tes untuk sendCustomEmailWithAttachment ---
  describe("sendCustomEmailWithAttachment", () => {
    test("harus mengirim email dengan lampiran", async () => {
      mockSendMail.mockResolvedValue();
      const attachmentPath = "/path/to/fake_report.pdf";
      await sendCustomEmailWithAttachment(
        "test@example.com",
        "Dedi",
        "pemecatan",
        attachmentPath
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Pemberitahuan Pemutusan Hubungan Kerja",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: "fake_report.pdf",
              path: attachmentPath,
            }),
          ]),
        })
      );
    });

    test("harus melempar error jika sendMail gagal", async () => {
      const networkError = new Error("Connection failed");
      mockSendMail.mockRejectedValue(networkError);

      await expect(
        sendCustomEmail("test@example.com", "Euis", "peringatan")
      ).rejects.toThrow("Connection failed");
    });
  });
});
