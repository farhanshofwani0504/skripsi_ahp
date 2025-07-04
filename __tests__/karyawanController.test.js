const karyawanController = require('../src/controllers/karyawanController');

// Menggunakan require (CommonJS) bukan import (ESM)
const {
  getAllKaryawan,
  getKaryawanById,
  addKaryawan,
  deleteKaryawan,
  updateKaryawan,
  downloadLaporanKaryawan,
  downloadGradesExcel,
  downloadRawScoresExcel,
} = require("../src/controllers/karyawanController.js");

const { calcRollingAvg, toGrade } = require("../src/utils/score.js");
const { PrismaClient } = require("@prisma/client");
const { generateKaryawanReportPDF } = require('../src/services/reportService');

// Mock dependensi
// Mock paket @prisma/client secara keseluruhan
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
jest.mock('../src/services/reportService');

// Buat instance mock prisma untuk digunakan di dalam tes
const prisma = new PrismaClient();

describe("Karyawan Controller", () => {
  let mockRequest, mockResponse, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { params: {}, body: {} };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
      setHeader: jest.fn(),
      send: jest.fn(),
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

      await getAllKaryawan(mockRequest, mockResponse, mockNext);

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
      await getAllKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
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

      await getKaryawanById(mockRequest, mockResponse, mockNext);

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
      await getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Karyawan tidak ditemukan",
      });
    });

    test("harus mengembalikan 400 jika ID invalid", async () => {
      mockRequest.params.id = "abc";
      await getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "ID invalid" });
    });

    test("harus memanggil next(err) jika terjadi error", async () => {
      mockRequest.params.id = "1";
      const error = new Error("DB Error");
      prisma.karyawan.findUnique.mockRejectedValue(error);
      await getKaryawanById(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // --- Tes untuk addKaryawan ---
  describe("addKaryawan", () => {
    test("harus membuat karyawan baru dan mengembalikan status 201", async () => {
      mockRequest.body = { nama: "Cici", posisi: "QA" };
      const newKaryawan = { id: 3, ...mockRequest.body };
      prisma.karyawan.create.mockResolvedValue(newKaryawan);

      await addKaryawan(mockRequest, mockResponse, mockNext);

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

      await addKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "email sudah dipakai",
      });
    });

    test("harus memanggil next(err) jika terjadi error lain", async () => {
      const error = new Error("Generic DB Error");
      prisma.karyawan.create.mockRejectedValue(error);
      mockRequest.body = { nama: "Cici", posisi: "QA" };

      await addKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // --- Tes untuk deleteKaryawan ---
  describe("deleteKaryawan", () => {
    test("harus menghapus karyawan dan mengembalikan pesan sukses", async () => {
      mockRequest.params.id = "1";
      prisma.karyawan.delete.mockResolvedValue({});
      await deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(prisma.karyawan.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: `karyawan #${1} terhapus ✅`,
      });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan saat delete (P2025)", async () => {
      mockRequest.params.id = "99";
      const error = { code: "P2025" };
      prisma.karyawan.delete.mockRejectedValue(error);
      await deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "karyawan tidak ditemukan",
      });
    });

    test("harus memanggil next(err) jika terjadi error lain", async () => {
      mockRequest.params.id = "1";
      const error = new Error("Generic DB Error");
      prisma.karyawan.delete.mockRejectedValue(error);
      await deleteKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
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

      await updateKaryawan(mockRequest, mockResponse, mockNext);

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

      await updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Email sudah dipakai" });
    });

    test("harus mengembalikan 404 jika karyawan tidak ditemukan saat update (P2025)", async () => {
      mockRequest.params.id = "99";
      mockRequest.body = { nama: "Test" };
      const error = { code: "P2025" };
      prisma.karyawan.update.mockRejectedValue(error);

      await updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: "Karyawan tidak ditemukan" });
    });

    test("harus mengembalikan 400 jika tidak ada field yang diupdate", async () => {
      mockRequest.params.id = "1";
      mockRequest.body = {}; // Body kosong
      await updateKaryawan(mockRequest, mockResponse, mockNext);
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

      await updateKaryawan(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
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

  describe('downloadGradesExcel', () => {
    test('harus berhasil mengunduh CSV grade karyawan', async () => {
      const mockKaryawanList = [
        { id: 1, nama: "Adi", email: "adi@example.com", posisi: "Dev" },
        { id: 2, nama: "Budi", email: "budi@example.com", posisi: "QA" },
      ];
      prisma.karyawan.findMany.mockResolvedValue(mockKaryawanList);
      calcRollingAvg.mockResolvedValueOnce(4.8).mockResolvedValueOnce(3.2);
      toGrade.mockReturnValueOnce("A").mockReturnValueOnce("B");

      await downloadGradesExcel(mockRequest, mockResponse, mockNext);

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

      await downloadGradesExcel(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await downloadRawScoresExcel(mockRequest, mockResponse, mockNext);

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

      await downloadRawScoresExcel(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});