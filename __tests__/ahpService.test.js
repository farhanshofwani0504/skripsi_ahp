// Impor fungsi yang akan diuji
const { recalculateAHP } = require("../src/services/ahpService.js");

// Impor dependensi yang akan di-mock
const prisma = require("../src/config/prismaClient");
const { calcCR } = require("../src/utils/ahp");

// Mock semua dependensi
jest.mock("../src/config/prismaClient", () => ({
  bobotKriteria: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
}));
jest.mock("../src/utils/ahp");

describe("AHP Service - recalculateAHP", () => {
  beforeEach(() => {
    // Bersihkan semua histori mock sebelum setiap tes
    jest.clearAllMocks();
  });

  test("harus menghitung, membuat operasi upsert, dan menjalankan transaksi", async () => {
    // 1. Setup Data & Mock
    const matrix = [
      [1, 3],
      [1 / 3, 1],
    ];
    const kriteriaIds = [10, 20];
    const mockCalcResult = { weights: [0.75, 0.25], CR: 0.01 };

    // Atur perilaku mock
    calcCR.mockReturnValue(mockCalcResult);
    // Asumsikan transaksi berhasil
    prisma.$transaction.mockResolvedValue();

    // 2. Panggil fungsi yang diuji
    const resultCR = await recalculateAHP(matrix, kriteriaIds);

    // 3. Lakukan Pengecekan (Assertion)
    // Pastikan utilitas kalkulasi dipanggil dengan benar
    expect(calcCR).toHaveBeenCalledWith(matrix);

    // Pastikan operasi upsert dipanggil dengan benar untuk setiap bobot
    expect(prisma.bobotKriteria.upsert).toHaveBeenCalledTimes(2);

    // Cek panggilan pertama untuk kriteriaId: 10
    expect(prisma.bobotKriteria.upsert).toHaveBeenCalledWith({
      where: { kriteriaId: 10 },
      update: { bobot: 0.75, cr: 0.01 },
      create: { kriteriaId: 10, bobot: 0.75, cr: 0.01 },
    });

    // Cek panggilan kedua untuk kriteriaId: 20
    expect(prisma.bobotKriteria.upsert).toHaveBeenCalledWith({
      where: { kriteriaId: 20 },
      update: { bobot: 0.25, cr: 0.01 },
      create: { kriteriaId: 20, bobot: 0.25, cr: 0.01 },
    });

    // Pastikan semua operasi upsert dijalankan dalam satu transaksi
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // Pastikan fungsi mengembalikan nilai CR yang benar
    expect(resultCR).toBe(mockCalcResult.CR);
  });

  test("harus melempar error jika transaksi database gagal", async () => {
    // 1. Setup
    const matrix = [
      [1, 3],
      [1 / 3, 1],
    ];
    const kriteriaIds = [10, 20];
    const mockCalcResult = { weights: [0.75, 0.25], CR: 0.01 };
    const dbError = new Error("Database transaction failed");

    // Atur perilaku mock
    calcCR.mockReturnValue(mockCalcResult);
    prisma.$transaction.mockRejectedValue(dbError); // Simulasikan transaksi gagal

    // 2. Panggil & Cek Error
    // Kita harapkan fungsi ini akan gagal (rejects) dan melempar error yang sama
    await expect(recalculateAHP(matrix, kriteriaIds)).rejects.toThrow(
      "Database transaction failed"
    );

    // Pastikan kalkulasi tetap berjalan meskipun database gagal
    expect(calcCR).toHaveBeenCalledWith(matrix);
  });
});
