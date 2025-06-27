// Impor fungsi yang akan diuji
// PATH DIPERBAIKI: Keluar dari __tests__, masuk ke src/controllers/
const {
  getAllBobot,
  upsertBobot,
} = require("../src/controllers/bobotController.js");

// Impor modul yang akan di-mock
// PATH DIPERBAIKI: Keluar dari __tests__, masuk ke src/config/
const prisma = require("../src/config/prismaClient");
// PATH DIPERBAIKI: Keluar dari __tests__, masuk ke src/utils/
const { hitungSkor6Bulan } = require("../src/utils/skor");

// Mock semua dependensi
// PATH DIPERBAIKI: Path di dalam mock juga harus benar
jest.mock("../src/config/prismaClient", () => ({
  bobotKriteria: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  karyawan: {
    findMany: jest.fn(),
  },
}));
jest.mock("../src/utils/skor");

// --- Kumpulan Tes untuk Fungsi getAllBobot ---
describe("getAllBobot Controller", () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {};
    mockResponse = { json: jest.fn() };
    mockNext = jest.fn();
  });

  test("harus mengembalikan semua bobot kriteria dengan sukses", async () => {
    const mockBobotList = [
      { id: 1, kriteriaId: 1, bobot: 0.5, kriteria: { nama: "Disiplin" } },
      { id: 2, kriteriaId: 2, bobot: 0.5, kriteria: { nama: "Kinerja" } },
    ];
    prisma.bobotKriteria.findMany.mockResolvedValue(mockBobotList);

    await getAllBobot(mockRequest, mockResponse, mockNext);

    expect(prisma.bobotKriteria.findMany).toHaveBeenCalledWith({
      include: { kriteria: true },
    });
    expect(mockResponse.json).toHaveBeenCalledWith(mockBobotList);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("harus memanggil next(e) jika terjadi error database", async () => {
    const dbError = new Error("Database error");
    prisma.bobotKriteria.findMany.mockRejectedValue(dbError);

    await getAllBobot(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});

// --- Kumpulan Tes untuk Fungsi upsertBobot ---
describe("upsertBobot Controller", () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: {
        kriteriaId: 1,
        bobot: 5, // Bobot awal sebelum normalisasi
      },
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
    mockNext = jest.fn();
  });

  test("harus berhasil upsert, normalisasi, dan menghitung ulang skor", async () => {
    const allBobotAfterUpsert = [
      { id: 1, kriteriaId: 1, bobot: 5 },
      { id: 2, kriteriaId: 2, bobot: 5 },
    ];
    const mockKaryawanList = [{ id: 101 }, { id: 102 }];

    // Atur perilaku mock
    prisma.bobotKriteria.upsert.mockResolvedValue(); // Step 1: upsert
    prisma.bobotKriteria.findMany.mockResolvedValue(allBobotAfterUpsert); // Step 2: get all for normalization
    prisma.bobotKriteria.update.mockResolvedValue(); // Step 3: normalization update
    prisma.karyawan.findMany.mockResolvedValue(mockKaryawanList); // Step 4: get all karyawan
    hitungSkor6Bulan.mockResolvedValue(); // Step 5: recalculate score

    await upsertBobot(mockRequest, mockResponse, mockNext);

    // Pengecekan Step 1: upsert
    expect(prisma.bobotKriteria.upsert).toHaveBeenCalledWith({
      where: { kriteriaId: 1 },
      update: { bobot: 5 },
      create: { kriteriaId: 1, bobot: 5 },
    });

    // Pengecekan Step 2 & 3: Normalisasi (total bobot = 10)
    // Harusnya update dipanggil 2 kali
    expect(prisma.bobotKriteria.update).toHaveBeenCalledTimes(2);
    // Pengecekan untuk normalisasi pertama
    expect(prisma.bobotKriteria.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { bobot: 5 / 10 }, // 0.5
    });
    // Pengecekan untuk normalisasi kedua
    expect(prisma.bobotKriteria.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { bobot: 5 / 10 }, // 0.5
    });

    // Pengecekan Step 4 & 5: Hitung ulang skor
    expect(prisma.karyawan.findMany).toHaveBeenCalledWith({
      select: { id: true },
    });
    expect(hitungSkor6Bulan).toHaveBeenCalledTimes(2);
    expect(hitungSkor6Bulan).toHaveBeenCalledWith(101);
    expect(hitungSkor6Bulan).toHaveBeenCalledWith(102);

    // Pengecekan respon akhir
    expect(mockResponse.json).toHaveBeenCalledWith({
      msg: "Bobot tersimpan & ternormalisasi",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("harus mengembalikan status 400 jika field kurang", async () => {
    mockRequest.body.kriteriaId = null;

    await upsertBobot(mockRequest, mockResponse, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ msg: "field kurang" });
    expect(prisma.bobotKriteria.upsert).not.toHaveBeenCalled();
  });

  test("harus memanggil next(e) jika upsert gagal", async () => {
    const dbError = new Error("Upsert failed");
    prisma.bobotKriteria.upsert.mockRejectedValue(dbError);

    await upsertBobot(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
  });
});
