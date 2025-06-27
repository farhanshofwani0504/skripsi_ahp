// Impor fungsi-fungsi yang akan diuji
const {
  getKesimpulanGlobal,
  getSkorKaryawan,
  getRingkasanBulanan,
} = require("../src/controllers/dashboardController.js");

// Impor Prisma untuk di-mock
const prisma = require("../src/config/prismaClient");

// Mock dependensi Prisma
jest.mock("../src/config/prismaClient", () => ({
  penilaian: {
    findMany: jest.fn(),
  },
  karyawan: {
    findMany: jest.fn(),
  },
}));

// --- Tes untuk getKesimpulanGlobal ---
describe("getKesimpulanGlobal Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
  });

  test("harus mengembalikan kesimpulan global dengan benar", async () => {
    // Data palsu dari prisma.penilaian.findMany
    const mockPenilaianData = [
      { nilai: 80, kriteria: { nama: "Disiplin" } },
      { nilai: 90, kriteria: { nama: "Kerja Tim" } },
      { nilai: 70, kriteria: { nama: "Disiplin" } },
      { nilai: 85, kriteria: { nama: "Kerja Tim" } },
    ];
    prisma.penilaian.findMany.mockResolvedValue(mockPenilaianData);

    await getKesimpulanGlobal(mockRequest, mockResponse);

    // Total Disiplin = 80 + 70 = 150
    // Total Kerja Tim = 90 + 85 = 175 (Tertinggi)
    expect(mockResponse.json).toHaveBeenCalledWith({
      kesimpulan: "Secara umum, karyawan lebih menonjol di Kerja Tim.",
      detail: [
        { kriteria: "Kerja Tim", total: 175 },
        { kriteria: "Disiplin", total: 150 },
      ],
    });
  });

  test("harus menangani status 500 jika terjadi error", async () => {
    const error = new Error("Database connection failed");
    prisma.penilaian.findMany.mockRejectedValue(error);

    await getKesimpulanGlobal(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
  });
});

// --- Tes untuk getSkorKaryawan ---
describe("getSkorKaryawan Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
  });

  test("harus menghitung dan mengembalikan skor total setiap karyawan", async () => {
    // Data palsu dari prisma.karyawan.findMany dengan struktur nested
    const mockKaryawanData = [
      {
        id: 1,
        nama: "Budi",
        posisi: "Developer",
        penilaian: [
          { nilai: 80, kriteria: { bobotKriteria: { bobot: 0.6 } } }, // 80 * 0.6 = 48
          { nilai: 90, kriteria: { bobotKriteria: { bobot: 0.4 } } }, // 90 * 0.4 = 36
        ],
      },
      {
        id: 2,
        nama: "Susi",
        posisi: "Designer",
        penilaian: [
          { nilai: 100, kriteria: { bobotKriteria: { bobot: 0.6 } } }, // 100 * 0.6 = 60
          { nilai: 70, kriteria: { bobotKriteria: null } }, // bobot null -> 70 * 0 = 0
        ],
      },
    ];
    prisma.karyawan.findMany.mockResolvedValue(mockKaryawanData);

    await getSkorKaryawan(mockRequest, mockResponse);

    // Total Budi = 48 + 36 = 84
    // Total Susi = 60 + 0 = 60
    expect(mockResponse.json).toHaveBeenCalledWith([
      { id: 1, nama: "Budi", posisi: "Developer", totalSkor: 84 },
      { id: 2, nama: "Susi", posisi: "Designer", totalSkor: 60 },
    ]);
  });

  test("harus menangani status 500 jika terjadi error", async () => {
    const error = new Error("Database query failed");
    prisma.karyawan.findMany.mockRejectedValue(error);

    await getSkorKaryawan(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: error.message });
  });
});

// --- Tes untuk getRingkasanBulanan ---
describe("getRingkasanBulanan Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
  });

  test("harus mengembalikan pesan placeholder dengan benar", async () => {
    await getRingkasanBulanan(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith({
      message: "Fitur ringkasan bulanan belum dibuat.",
    });
  });
});
