// Menggunakan require (CommonJS) bukan import (ESM)
const {
  getAllKaryawan,
  getKaryawanById,
  addKaryawan,
  deleteKaryawan,
  updateKaryawan,
} = require("../src/controllers/karyawanController.js");

const { calcRollingAvg, toGrade } = require("../src/utils/score.js");
const { PrismaClient } = require("@prisma/client");

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
    };
    mockNext = jest.fn();
  });

  // --- Tes untuk getAllKaryawan ---
  describe("getAllKaryawan", () => {
    test("harus mengembalikan daftar karyawan dengan rolling average dan grade", async () => {
      const mockKaryawanList = [
        { id: 1, nama: "Adi" },
        { id: 2, nama: "Budi" },
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
        { id: 1, nama: "Adi", rollingAvg: 85, grade: "A" },
        { id: 2, nama: "Budi", rollingAvg: 85, grade: "A" },
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

    test("harus mengembalikan 400 jika tidak ada field yang diupdate", async () => {
      mockRequest.params.id = "1";
      mockRequest.body = {}; // Body kosong
      await updateKaryawan(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Tidak ada field di‑update",
      });
    });
  });
});
