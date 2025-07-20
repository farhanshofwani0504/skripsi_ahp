// Impor fungsi yang akan diuji
const {
  kirimNotifikasiMassal,
  kirimEmailKaryawan,
  kirimPeringatan,
} = require("../src/controllers/notifikasiController.js");

// Impor dependensi yang perlu di-mock
const prisma = require("../src/config/prismaClient"); // Impor prisma yang akan kita gunakan
const {
  sendCustomEmailWithAttachment,
  sendCustomEmail,
} = require("../src/services/emailService.js");
const { toGrade } = require("../src/utils/score.js");
const fs = require("fs-extra");
const PDFDocument = require("pdfkit");

// Mock semua dependensi
// PERBAIKAN: Mock file config prisma, bukan paket @prisma/client
jest.mock("../src/config/prismaClient", () => ({
  karyawan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  penilaian: {
    findMany: jest.fn(),
  },
}));

jest.mock("../src/services/emailService.js");
jest.mock("../src/utils/score.js");
jest.mock("fs-extra");

// Mock PDFKit secara mendalam karena metodenya chainable
jest.mock("pdfkit", () => {
  return jest.fn().mockImplementation(() => {
    const mockPdf = {
      pipe: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    return mockPdf;
  });
});

describe("Notifikasi Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { body: {}, params: {} };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
  });

  // --- Tes untuk kirimPemecatanMassal ---
  describe("kirimNotifikasiMassal", () => {
    test("harus mengirim email pemecatan hanya kepada karyawan dengan grade E", async () => {
      const karyawanList = [
        {
          id: 1,
          nama: "Budi",
          email: "budi@example.com",
          penilaian: [{ nilai: 1.2, createdAt: new Date() }], // Mock penilaian data for Budi
        },
        {
          id: 2,
          nama: "Ani",
          email: "ani@example.com",
          penilaian: [{ nilai: 3.0, createdAt: new Date() }], // Mock penilaian data for Ani
        },
      ];

      prisma.karyawan.findMany.mockResolvedValue(karyawanList);

      toGrade
        .mockReturnValueOnce("E") // Panggilan pertama untuk Budi
        .mockReturnValueOnce("C"); // Panggilan kedua untuk Ani

      sendCustomEmailWithAttachment.mockResolvedValue();

      await kirimNotifikasiMassal(mockRequest, mockResponse);

      // Pastikan PDF dan email hanya dibuat untuk Budi
      expect(PDFDocument).toHaveBeenCalledTimes(1);
      expect(sendCustomEmailWithAttachment).toHaveBeenCalledTimes(1);
      expect(sendCustomEmailWithAttachment).toHaveBeenCalledWith(
        "budi@example.com",
        "Budi",
        "pemecatan",
        expect.any(String),
        expect.any(Array),
        "[Nama Owner/HRD]"
      );

      // Cek respon akhir
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Notifikasi pemecatan selesai",
        data: [{ nama: "Budi", status: "Email pemecatan terkirim" }],
      });
    });

    test("harus mengembalikan status 500 jika terjadi error", async () => {
      const error = new Error("Prisma find failed");
      prisma.karyawan.findMany.mockRejectedValue(error);
      await kirimNotifikasiMassal(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
    });
  });

  // --- Tes untuk kirimEmailKaryawan ---
  describe("kirimEmailKaryawan", () => {
    test("harus berhasil mengirim email ke karyawan tertentu", async () => {
      const karyawan = { id: 1, nama: "Cici", email: "cici@example.com" };
      mockRequest.body = { karyawanId: 1, jenisEmail: "apresiasi" };
      prisma.karyawan.findUnique.mockResolvedValue(karyawan);
      prisma.penilaian.findMany.mockResolvedValue([]); // Add this line
      sendCustomEmail.mockResolvedValue();

      await kirimEmailKaryawan(mockRequest, mockResponse);

      expect(sendCustomEmail).toHaveBeenCalledWith(
        "cici@example.com",
        "Cici",
        "apresiasi",
        expect.any(Array) // We expect the penilaian array to be passed
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: `Email apresiasi berhasil dikirim ke Cici`,
      });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan", async () => {
      mockRequest.body = { karyawanId: 99, jenisEmail: "apresiasi" };
      prisma.karyawan.findUnique.mockResolvedValue(null);
      await kirimEmailKaryawan(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Karyawan tidak ditemukan atau tidak memiliki alamat email yang valid",
      });
    });
  });

  // --- Tes untuk kirimPeringatan ---
  describe("kirimPeringatan", () => {
    test("harus mengembalikan pesan placeholder", async () => {
      await kirimPeringatan(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Fitur kirim peringatan massal belum diimplementasikan.",
      });
    });
  });
});
