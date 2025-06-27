// Impor fungsi-fungsi yang akan diuji
const {
  getAllKriteria,
  addKriteria,
  deleteKriteria,
  recalculate,
} = require("../src/controllers/kriteriaController.js");

// Impor dependensi yang akan di-mock
const prisma = require("../src/config/prismaClient");
const { recalculateAHP } = require("../src/services/ahpService");

// Mock semua dependensi
jest.mock("../src/config/prismaClient", () => ({
  kriteria: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../src/services/ahpService");

describe("Kriteria Controller", () => {
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

  // --- Tes untuk getAllKriteria ---
  describe("getAllKriteria", () => {
    test("harus mengembalikan semua kriteria dengan sukses", async () => {
      const mockKriteriaList = [{ id: 1, nama: "Disiplin" }];
      prisma.kriteria.findMany.mockResolvedValue(mockKriteriaList);

      await getAllKriteria(mockRequest, mockResponse);

      expect(prisma.kriteria.findMany).toHaveBeenCalledWith({
        include: { penilaian: true },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockKriteriaList);
    });

    test("harus mengembalikan status 500 jika terjadi error", async () => {
      const error = new Error("DB Error");
      prisma.kriteria.findMany.mockRejectedValue(error);
      await getAllKriteria(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
    });
  });

  // --- Tes untuk addKriteria ---
  describe("addKriteria", () => {
    test("harus membuat kriteria baru dan mengembalikan status 201", async () => {
      mockRequest.body.nama = "Komunikasi";
      const newKriteria = { id: 2, nama: "Komunikasi" };
      prisma.kriteria.create.mockResolvedValue(newKriteria);

      await addKriteria(mockRequest, mockResponse);

      expect(prisma.kriteria.create).toHaveBeenCalledWith({
        data: { nama: "Komunikasi" },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(newKriteria);
    });

    test("harus mengembalikan status 500 jika create gagal", async () => {
      const error = new Error("Create failed");
      prisma.kriteria.create.mockRejectedValue(error);
      mockRequest.body.nama = "Komunikasi";
      await addKriteria(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
    });
  });

  // --- Tes untuk deleteKriteria ---
  describe("deleteKriteria", () => {
    test("harus menghapus kriteria dan mengembalikan pesan sukses", async () => {
      mockRequest.params.id = "1";
      prisma.kriteria.delete.mockResolvedValue({});

      await deleteKriteria(mockRequest, mockResponse);

      expect(prisma.kriteria.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Kriteria berhasil dihapus",
      });
    });

    test("harus mengembalikan status 500 jika delete gagal", async () => {
      const error = new Error("Delete failed");
      prisma.kriteria.delete.mockRejectedValue(error);
      mockRequest.params.id = "1";
      await deleteKriteria(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
    });
  });

  // --- Tes untuk recalculate ---
  describe("recalculate", () => {
    test("harus memanggil service AHP dan mengembalikan CR", async () => {
      mockRequest.body = {
        matrix: [
          [1, 3],
          [1 / 3, 1],
        ],
        kriteriaIds: [1, 2],
      };
      const mockCR = 0.05;
      recalculateAHP.mockResolvedValue(mockCR);

      await recalculate(mockRequest, mockResponse, mockNext);

      expect(recalculateAHP).toHaveBeenCalledWith(
        mockRequest.body.matrix,
        mockRequest.body.kriteriaIds
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Bobot ter‑update",
        cr: mockCR,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("harus memanggil next(err) jika service AHP gagal", async () => {
      const serviceError = new Error("AHP Service Error");
      recalculateAHP.mockRejectedValue(serviceError);
      mockRequest.body = { matrix: [], kriteriaIds: [] };

      await recalculate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
