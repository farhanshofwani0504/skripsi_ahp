// Impor fungsi-fungsi yang akan diuji
const {
  getAllPenilaian,
  upsertPenilaian,
  deletePenilaian,
  getOverview,
  getRanking, // Tambahkan fungsi baru
} = require("../src/controllers/penilaianController.js");

// Impor dependensi yang akan di-mock
const prisma = require("../src/config/prismaClient");
const { hitungSkor6Bulan } = require("../src/utils/skor");

// Mock semua dependensi
jest.mock("../src/config/prismaClient", () => ({
  penilaian: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  karyawan: {
    findUnique: jest.fn(),
    findMany: jest.fn(), // Tambahkan findMany ke mock karyawan
  },
  bobotKriteria: {
    // Tambahkan mock untuk bobotKriteria
    findMany: jest.fn(),
  },
  // Mock $queryRaw sebagai fungsi top-level
  $queryRaw: jest.fn(),
}));

jest.mock("../src/utils/skor");

describe("Penilaian Controller", () => {
  let mockRequest, mockResponse, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { body: {}, params: {} };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
    mockNext = jest.fn();
  });

  // --- Tes untuk getAllPenilaian ---
  describe("getAllPenilaian", () => {
    test("harus mengembalikan semua data penilaian", async () => {
      const mockData = [{ id: 1, nilai: 90 }];
      prisma.penilaian.findMany.mockResolvedValue(mockData);
      await getAllPenilaian(mockRequest, mockResponse);
      expect(prisma.penilaian.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockData);
    });
  });

  // --- Tes untuk upsertPenilaian ---
  describe("upsertPenilaian", () => {
    beforeEach(() => {
      mockRequest.body = {
        karyawanId: 1,
        kriteriaId: 1,
        nilai: 85,
        bulan: "2025-06",
      };
      hitungSkor6Bulan.mockResolvedValue(); // Mock helper function
    });

    test("harus meng-update penilaian jika sudah ada di bulan yang sama", async () => {
      const existingPenilaian = { id: 99, nilai: 80 };
      const updatedPenilaian = { id: 99, nilai: 85 };
      prisma.penilaian.findFirst.mockResolvedValue(existingPenilaian);
      prisma.penilaian.update.mockResolvedValue(updatedPenilaian);

      await upsertPenilaian(mockRequest, mockResponse, mockNext);

      expect(prisma.penilaian.findFirst).toHaveBeenCalled();
      expect(prisma.penilaian.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { nilai: 85 },
      });
      expect(prisma.penilaian.create).not.toHaveBeenCalled();
      expect(hitungSkor6Bulan).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedPenilaian);
    });

    test("harus membuat penilaian baru jika belum ada", async () => {
      const newPenilaian = { id: 100, nilai: 85 };
      prisma.penilaian.findFirst.mockResolvedValue(null); // Tidak ada data
      prisma.penilaian.create.mockResolvedValue(newPenilaian);

      await upsertPenilaian(mockRequest, mockResponse, mockNext);

      expect(prisma.penilaian.create).toHaveBeenCalledWith({
        data: {
          karyawanId: 1,
          kriteriaId: 1,
          nilai: 85,
          createdAt: new Date("2025-06-01T00:00:00.000Z"),
        },
      });
      expect(prisma.penilaian.update).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(newPenilaian);
    });

    test("harus mengembalikan 400 jika field kurang", async () => {
      mockRequest.body.bulan = null;
      await upsertPenilaian(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ msg: "field kurang" });
    });
  });

  // --- Tes untuk deletePenilaian ---
  describe("deletePenilaian", () => {
    test("harus menghapus penilaian dengan sukses", async () => {
      mockRequest.params.id = "1";
      prisma.penilaian.delete.mockResolvedValue({});
      await deletePenilaian(mockRequest, mockResponse);
      expect(prisma.penilaian.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Penilaian berhasil dihapus",
      });
    });
  });

  // --- Tes untuk getOverview ---
  describe("getOverview", () => {
    beforeEach(() => {
      mockRequest.params.karyawanId = "1";
      const mockKaryawan = { nama: "Budi", startDate: new Date("2024-01-01") };
      prisma.karyawan.findUnique.mockResolvedValue(mockKaryawan);
    });

    test('harus mengembalikan overview lengkap dengan kesimpulan "sangat baik"', async () => {
      const mockMonthly = [{ period: "2025-05-01", avg_nilai: 4.5 }];
      prisma.$queryRaw
        .mockResolvedValueOnce(mockMonthly) // Monthly
        .mockResolvedValueOnce([]) // Quarterly
        .mockResolvedValueOnce([]); // Yearly

      await getOverview(mockRequest, mockResponse, mockNext);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          karyawan: "Budi",
          kesimpulan:
            "Kinerja sangat baik, layak dipertimbangkan naik gaji/pangkat.",
        })
      );
    });

    test('harus mengembalikan kesimpulan "perlu ditingkatkan" jika skor rendah', async () => {
      const mockMonthly = [{ period: "2025-05-01", avg_nilai: 2.1 }];
      prisma.$queryRaw.mockResolvedValue(mockMonthly); // Semua query raw mengembalikan hasil ini
      await getOverview(mockRequest, mockResponse, mockNext);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          kesimpulan: "Kinerja perlu ditingkatkan, pertimbangkan coaching.",
        })
      );
    });
  });

  // --- Tes untuk getRanking ---
  describe("getRanking", () => {
    test("harus menghitung dan mengembalikan ranking karyawan dengan benar", async () => {
      // Siapkan data mock
      const mockBobot = [
        { kriteriaId: 1, bobot: 0.6 },
        { kriteriaId: 2, bobot: 0.4 },
      ];
      const mockKaryawan = [
        {
          id: 10,
          nama: "Budi",
          posisi: "Dev",
          penilaian: [
            { kriteriaId: 1, nilai: 100 },
            { kriteriaId: 2, nilai: 80 },
          ],
        }, // Skor: 100*0.6 + 80*0.4 = 92
        {
          id: 20,
          nama: "Ani",
          posisi: "QA",
          penilaian: [
            { kriteriaId: 1, nilai: 90 },
            { kriteriaId: 2, nilai: 90 },
          ],
        }, // Skor: 90*0.6 + 90*0.4 = 90
      ];

      // Atur perilaku mock
      prisma.bobotKriteria.findMany.mockResolvedValue(mockBobot);
      prisma.karyawan.findMany.mockResolvedValue(mockKaryawan);

      await getRanking(mockRequest, mockResponse);

      // Pengecekan hasil akhir
      const expectedRanking = [
        { id: 10, nama: "Budi", posisi: "Dev", totalSkor: 92 },
        { id: 20, nama: "Ani", posisi: "QA", totalSkor: 90 },
      ];

      expect(prisma.bobotKriteria.findMany).toHaveBeenCalled();
      expect(prisma.karyawan.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expectedRanking);
    });

    test("harus menangani error 500 jika database gagal", async () => {
      const error = new Error("Database query failed");
      prisma.bobotKriteria.findMany.mockRejectedValue(error); // Simulasikan error
      await getRanking(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
    });
  });
});
