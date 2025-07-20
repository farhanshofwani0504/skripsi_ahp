const karyawanController = require('../src/controllers/karyawanController');
const { PrismaClient } = require("@prisma/client");
const { calcRollingAvg, toGrade } = require("../src/utils/score.js");
const { generateKaryawanReportPDF } = require('../src/services/reportService');
const { sendCustomEmailWithAttachment } = require('../src/services/emailService');

// Mock semua dependensi
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    karyawan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    penilaian: {
      findMany: jest.fn(),
    },
    kriteria: {
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock utility functions
jest.mock("../src/utils/score.js", () => ({
  calcRollingAvg: jest.fn(),
  toGrade: jest.fn(),
}));

// Mock report service
jest.mock('../src/services/reportService', () => ({
  generateKaryawanReportPDF: jest.fn(),
}));

// Mock email service
jest.mock('../src/services/emailService', () => ({
  sendCustomEmailWithAttachment: jest.fn(),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  createReadStream: jest.fn(() => ({
    pipe: jest.fn().mockReturnThis(),
  })),
  unlinkSync: jest.fn(),
}));

// Mock csv-parse
jest.mock('csv-parse', () => ({
  parse: jest.fn(() => ({
    on: jest.fn(function(event, callback) {
      if (event === 'data') {
        // Mock data untuk importCsvKaryawan
        callback({ nama: 'Test Karyawan 1', posisi: 'Staff', email: 'test1@example.com' });
        callback({ nama: 'Test Karyawan 2', posisi: 'Manager', email: 'test2@example.com' });
      } else if (event === 'end') {
        callback();
      } else if (event === 'error') {
        // Simulate error if needed
      }
      return this;
    }),
  })),
}));

// Mock PDFKit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    page: { margins: { left: 60, right: 60 }, width: 500 },
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
  }));
});

const prisma = new PrismaClient();

describe("Karyawan Controller", () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      params: {},
      body: {},
      file: null,
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  // --- Tes untuk getAllKaryawan ---
  describe("getAllKaryawan", () => {
    test("harus mengembalikan daftar karyawan dengan rolling average dan grade", async () => {
      const mockKaryawanList = [
        { id: 1, nama: "Adi", email: "adi@example.com", posisi: "Dev" },
        { id: 2, nama: "Budi", email: "budi@example.com", posisi: "QA" },
      ];
      prisma.karyawan.findMany.mockResolvedValue(mockKaryawanList);
      calcRollingAvg.mockResolvedValue(85);
      toGrade.mockReturnValue("A");

      await karyawanController.getAllKaryawan(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.findMany).toHaveBeenCalledWith({
        orderBy: { id: "asc" },
      });
      expect(calcRollingAvg).toHaveBeenCalledTimes(2);
      expect(toGrade).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith([
        { id: 1, nama: "Adi", email: "adi@example.com", posisi: "Dev", rollingAvg: 85, grade: "A" },
        { id: 2, nama: "Budi", email: "budi@example.com", posisi: "QA", rollingAvg: 85, grade: "A" },
      ]);
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      const error = new Error("DB Error");
      prisma.karyawan.findMany.mockRejectedValue(error);
      await karyawanController.getAllKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk getKaryawanById ---
  describe("getKaryawanById", () => {
    test("harus mengembalikan satu karyawan jika ID valid dan ditemukan", async () => {
      mockRequest.params.id = "1";
      const mockKaryawan = { id: 1, nama: "Adi" };
      prisma.karyawan.findUnique.mockResolvedValue(mockKaryawan);
      calcRollingAvg.mockResolvedValue(90);
      toGrade.mockReturnValue("A+");

      await karyawanController.getKaryawanById(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...mockKaryawan,
        rollingAvg: 90,
        grade: "A+",
      });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan", async () => {
      mockRequest.params.id = "99";
      prisma.karyawan.findUnique.mockResolvedValue(null);
      await karyawanController.getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Karyawan tidak ditemukan",
      });
    });

    test("harus mengembalikan 400 jika ID invalid", async () => {
      mockRequest.params.id = "abc";
      await karyawanController.getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "ID invalid" });
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      mockRequest.params.id = "1";
      const error = new Error("DB Error");
      prisma.karyawan.findUnique.mockRejectedValue(error);
      await karyawanController.getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk getKaryawanPenilaian ---
  describe("getKaryawanPenilaian", () => {
    test("harus mengembalikan data karyawan dengan penilaian jika ID valid", async () => {
      mockRequest.params.id = "1";
      const mockKaryawanWithPenilaian = {
        id: 1,
        nama: "Test Karyawan",
        penilaian: [
          { id: 101, nilai: 4.5, createdAt: new Date(), kriteria: { nama: "Disiplin" } },
          { id: 102, nilai: 3.8, createdAt: new Date(), kriteria: { nama: "Kerja Sama" } },
        ],
      };
      prisma.karyawan.findUnique.mockResolvedValue(mockKaryawanWithPenilaian);

      await karyawanController.getKaryawanPenilaian(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          penilaian: {
            orderBy: { createdAt: "asc" },
            include: {
              kriteria: { select: { nama: true } },
            },
          },
        },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockKaryawanWithPenilaian);
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan", async () => {
      mockRequest.params.id = "99";
      prisma.karyawan.findUnique.mockResolvedValue(null);

      await karyawanController.getKaryawanPenilaian(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Karyawan tidak ditemukan" });
    });

    test("harus mengembalikan 400 jika ID karyawan tidak valid", async () => {
      mockRequest.params.id = "abc";

      await karyawanController.getKaryawanPenilaian(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "ID karyawan tidak valid" });
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      mockRequest.params.id = "1";
      const error = new Error("DB Error");
      prisma.karyawan.findUnique.mockRejectedValue(error);

      await karyawanController.getKaryawanPenilaian(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk addKaryawan ---
  describe("addKaryawan", () => {
    test("harus membuat karyawan baru dan mengembalikan status 201", async () => {
      mockRequest.body = { nama: "Cici", posisi: "QA" };
      const newKaryawan = { id: 3, ...mockRequest.body };
      prisma.karyawan.create.mockResolvedValue(newKaryawan);

      await karyawanController.addKaryawan(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.create).toHaveBeenCalledWith({
        data: { nama: "Cici", posisi: "QA", email: null },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(newKaryawan);
    });

    test("harus mengembalikan 409 jika email sudah terpakai (P2002)", async () => {
      const error = { code: "P2002", meta: { target: ["email"] } };
      prisma.karyawan.create.mockRejectedValue(error);
      mockRequest.body = { nama: "Cici", posisi: "QA", email: "test@mail.com" };

      await karyawanController.addKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "email sudah dipakai",
      });
    });

    test("harus memanggil next(err) jika terjadi error lain", async () => {
      const error = new Error("Generic DB Error");
      prisma.karyawan.create.mockRejectedValue(error);
      mockRequest.body = { nama: "Cici", posisi: "QA" };

      await karyawanController.addKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk importCsvKaryawan ---
  describe("importCsvKaryawan", () => {
    // TODO: Add tests for importCsvKaryawan
  });

  // --- Tes untuk importCsvNilai ---
  describe("importCsvNilai", () => {
    test("harus mengembalikan 400 jika tidak ada file", async () => {
      mockRequest.file = undefined;

      await karyawanController.importCsvNilai(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'File CSV tidak ditemukan' });
    });
  });

  // --- Tes untuk deleteKaryawan ---
  describe("deleteKaryawan", () => {
    test("harus menghapus karyawan dan mengembalikan pesan sukses", async () => {
      mockRequest.params.id = "1";
      prisma.karyawan.delete.mockResolvedValue({});
      await karyawanController.deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(prisma.karyawan.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: `karyawan #${1} terhapus ✅`,
      });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan saat delete (P2025)", async () => {
      mockRequest.params.id = "99";
      const error = { code: "P2025" };
      prisma.karyawan.delete.mockRejectedValue(error);
      await karyawanController.deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "karyawan tidak ditemukan",
      });
    });

    test("harus memanggil next(err) jika terjadi error lain", async () => {
      mockRequest.params.id = "1";
      const error = new Error("Generic DB Error");
      prisma.karyawan.delete.mockRejectedValue(error);
      await karyawanController.deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk updateKaryawan ---
  describe("updateKaryawan", () => {
    test("harus mengupdate karyawan dengan sukses", async () => {
      mockRequest.params.id = "1";
      mockRequest.body = { nama: "Adi Wijaya" };
      const updatedKaryawan = {
        id: 1,
        nama: "Adi Wijaya",
        posisi: "Senior Dev",
      };
      prisma.karyawan.update.mockResolvedValue(updatedKaryawan);

      await karyawanController.updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nama: "Adi Wijaya" },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(updatedKaryawan);
    });

    test("harus mengembalikan 409 jika email sudah dipakai (P2002)", async () => {
      mockRequest.params.id = "1";
      mockRequest.body = { email: "existing@mail.com" };
      const error = { code: "P2002", meta: { target: ["email"] } };
      prisma.karyawan.update.mockRejectedValue(error);

      await karyawanController.updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Email sudah dipakai" });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan saat update (P2025)", async () => {
      mockRequest.params.id = "99";
      mockRequest.body = { nama: "Test" };
      const error = { code: "P2025" };
      prisma.karyawan.update.mockRejectedValue(error);

      await karyawanController.updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Karyawan tidak ditemukan" });
    });

    test("harus mengembalikan 400 jika tidak ada field yang diupdate", async () => {
      mockRequest.params.id = "1";
      mockRequest.body = {}; // Body kosong
      await karyawanController.updateKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Tidak ada field di‑update",
      });
    });

    test("harus memanggil next(err) jika terjadi error lain", async () => {
      mockRequest.params.id = "1";
      const error = new Error("Generic DB Error");
      prisma.karyawan.update.mockRejectedValue(error);
      mockRequest.body = { nama: "Test" };

      await karyawanController.updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('downloadLaporanKaryawan', () => {
    it('berhasil download PDF', async () => {
      prisma.karyawan.findUnique.mockResolvedValue({
        id: 6,
        nama: 'E F',
        penilaian: [],
      });
      generateKaryawanReportPDF.mockResolvedValue(Buffer.from('pdf'));
      mockRequest.params.id = '6';
      await karyawanController.downloadLaporanKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('Laporan_Kinerja_E_F.pdf')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
    it('id tidak valid', async () => {
      mockRequest.params.id = 'abc';
      await karyawanController.downloadLaporanKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    it('karyawan tidak ditemukan', async () => {
      prisma.karyawan.findUnique.mockResolvedValue(null);
      mockRequest.params.id = '99';
      await karyawanController.downloadLaporanKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
    it('menangani error', async () => {
      const error = new Error('fail');
      prisma.karyawan.findUnique.mockRejectedValue(error);
      mockRequest.params.id = '1';
      await karyawanController.downloadLaporanKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk reviewPerpanjanganKontrak ---
  describe("reviewPerpanjanganKontrak", () => {
    test("harus mengembalikan rekomendasi perpanjangan kontrak", async () => {
      mockRequest.params.id = "1";
      prisma.penilaian.findMany.mockResolvedValue([
        { nilai: 4.0 },
        { nilai: 3.0 },
        { nilai: 5.0 },
      ]);
      toGrade.mockReturnValue("B");

      await karyawanController.reviewPerpanjanganKontrak(mockRequest, mockResponse, mockNext);

      expect(prisma.penilaian.findMany).toHaveBeenCalledWith({
        where: { karyawanId: 1 },
      });
      expect(toGrade).toHaveBeenCalledWith(4.0);
      expect(mockResponse.json).toHaveBeenCalledWith({
        rataRata: 4.0,
        grade: "B",
        rekomendasi: "Layak diperpanjang",
        totalPenilaian: 3,
        historiKontrak: [
          { mulai: "2023-01-01", akhir: "2024-01-01", status: "Selesai" }
        ]
      });
    });

    test("harus mengembalikan 400 jika ID invalid", async () => {
      mockRequest.params.id = "abc";

      await karyawanController.reviewPerpanjanganKontrak(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "ID invalid" });
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      mockRequest.params.id = "1";
      const error = new Error("DB Error");
      prisma.penilaian.findMany.mockRejectedValue(error);

      await karyawanController.reviewPerpanjanganKontrak(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk downloadGradesExcel ---
  describe("downloadGradesExcel", () => {
    test('harus berhasil mengunduh CSV grade karyawan', async () => {
      const mockKaryawanList = [
        { id: 1, nama: "Adi", email: "adi@example.com", posisi: "Dev" },
        { id: 2, nama: "Budi", email: "budi@example.com", posisi: "QA" },
      ];
      prisma.karyawan.findMany.mockResolvedValue(mockKaryawanList);
      calcRollingAvg.mockResolvedValueOnce(4.8).mockResolvedValueOnce(3.2);
      toGrade.mockReturnValueOnce("A").mockReturnValueOnce("B");

      await karyawanController.downloadGradesExcel(mockRequest, mockResponse, mockNext);

      const expectedCsv = 
        "Nama,Posisi,Email,Rata-rata Nilai,Grade\n" +
        "\"Adi\",\"Dev\",\"adi@example.com\",\"4.80\",\"A\"\n" +
        "\"Budi\",\"QA\",\"budi@example.com\",\"3.20\",\"B\"";

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", "attachment; filename=\"laporan_grade_karyawan.csv\"");
      expect(mockResponse.send).toHaveBeenCalledWith(expectedCsv);
    });

    test('harus memanggil next(err) jika terjadi error', async () => {
      const error = new Error("DB Error");
      prisma.karyawan.findMany.mockRejectedValue(error);

      await karyawanController.downloadGradesExcel(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('downloadRawScoresExcel', () => {
    test('harus berhasil mengunduh CSV nilai mentah', async () => {
      const mockPenilaianData = [
        {
          karyawan: { nama: "Adi", posisi: "Dev", email: "adi@example.com" },
          kriteria: { nama: "Disiplin" },
          nilai: 4.5,
          createdAt: new Date("2024-01-01"),
        },
        {
          karyawan: { nama: "Budi", posisi: "QA", email: "budi@example.com" },
          kriteria: { nama: "Produktivitas" },
          nilai: 3.0,
          createdAt: new Date("2024-01-02"),
        },
      ];
      prisma.penilaian.findMany.mockResolvedValue(mockPenilaianData);

      await karyawanController.downloadRawScoresExcel(mockRequest, mockResponse, mockNext);

      const expectedCsv = 
        "Nama Karyawan,Posisi,Email,Nama Kriteria,Nilai,Tanggal Penilaian\n" +
        "\"Adi\",\"Dev\",\"adi@example.com\",\"Disiplin\",\"4.5\",\"2024-01-01\"\n" +
        "\"Budi\",\"QA\",\"budi@example.com\",\"Produktivitas\",\"3\",\"2024-01-02\"";

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", "attachment; filename=\"laporan_nilai_mentah.csv\"");
      expect(mockResponse.send).toHaveBeenCalledWith(expectedCsv);
    });

    test('harus memanggil next(err) jika terjadi error', async () => {
      const error = new Error("DB Error");
      prisma.penilaian.findMany.mockRejectedValue(error);

      await karyawanController.downloadRawScoresExcel(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk pemecatanKaryawanById ---
  describe("pemecatanKaryawanById", () => {
    test("harus berhasil mengirim email pemecatan", async () => {
      const mockKaryawan = {
        id: 1,
        nama: "Test Karyawan",
        email: "test@example.com",
        penilaian: [
          { nilai: 1.0, createdAt: new Date(), kriteria: { nama: "Kriteria A" } },
        ],
      };
      mockRequest.params.id = "1";
      prisma.karyawan.findUnique.mockResolvedValue(mockKaryawan);
      generateKaryawanReportPDF.mockResolvedValue("path/to/pdf"); // Mock the PDF generation
      sendCustomEmailWithAttachment.mockResolvedValue(); // Mock email sending

      await karyawanController.pemecatanKaryawanById(mockRequest, mockResponse, mockNext);

      expect(prisma.karyawan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          penilaian: {
            orderBy: { createdAt: "asc" },
            include: {
              kriteria: { select: { nama: true } },
            },
          },
        },
      });
      expect(generateKaryawanReportPDF).toHaveBeenCalledWith(mockKaryawan, mockKaryawan.penilaian, "[Nama Owner/HRD]");
      expect(sendCustomEmailWithAttachment).toHaveBeenCalledWith(
        "test@example.com",
        "Test Karyawan",
        "pemecatan",
        "path/to/pdf",
        mockKaryawan.penilaian,
        "[Nama Owner/HRD]"
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: `Email pemecatan berhasil dikirim ke Test Karyawan`,
        karyawanId: 1,
      });
    });

    test("harus mengembalikan 400 jika ID karyawan tidak valid", async () => {
      mockRequest.params.id = "abc";

      await karyawanController.pemecatanKaryawanById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "ID karyawan tidak valid" });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan", async () => {
      mockRequest.params.id = "99";
      prisma.karyawan.findUnique.mockResolvedValue(null);

      await karyawanController.pemecatanKaryawanById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Karyawan tidak ditemukan" });
    });

    test("harus mengembalikan 400 jika karyawan tidak memiliki email", async () => {
      mockRequest.params.id = "1";
      prisma.karyawan.findUnique.mockResolvedValue({ id: 1, nama: "Test", email: "" });

      await karyawanController.pemecatanKaryawanById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Karyawan tidak memiliki alamat email yang valid untuk pengiriman notifikasi." });
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      mockRequest.params.id = "1";
      const error = new Error("DB Error");
      prisma.karyawan.findUnique.mockRejectedValue(error);

      await karyawanController.pemecatanKaryawanById(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // --- Tes untuk generateRekapGlobalPDF ---
  describe("generateRekapGlobalPDF", () => {
    test("harus memanggil next(err) jika terjadi error", async () => {
      const error = new Error("DB Error");
      prisma.karyawan.findMany.mockRejectedValue(error);

      await karyawanController.generateRekapGlobalPDF(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});