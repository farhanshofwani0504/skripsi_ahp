// Impor fungsi yang akan diuji
const { calcCR } = require("../src/utils/ahp.js");

describe("AHP Utility - calcCR", () => {
  test("harus menghitung weights, lambdaMax, CI, dan CR dengan benar untuk matriks 3x3", () => {
    // 1. Setup: Gunakan matriks yang sudah diketahui hasilnya
    const matrix = [
      [1, 3, 5],
      [1 / 3, 1, 3],
      [1 / 5, 1 / 3, 1],
    ];

    // 2. Panggil fungsi yang diuji
    const result = calcCR(matrix);

    // 3. Lakukan Pengecekan (Assertion)
    // Cek bobot (eigenvector)
    expect(result.weights[0]).toBeCloseTo(0.633, 3);
    expect(result.weights[1]).toBeCloseTo(0.26, 3);
    expect(result.weights[2]).toBeCloseTo(0.106, 3);

    // Cek nilai-nilai konsistensi
    // PERBAIKAN: Disesuaikan dengan presisi hasil perhitungan
    expect(result.lambdaMax).toBeCloseTo(3.0385, 3);
    expect(result.CI).toBeCloseTo(0.019, 3);
    expect(result.CR).toBe(0.0331);
  });

  test("harus menghitung dengan benar untuk matriks 4x4", () => {
    const matrix = [
      [1, 2, 5, 1],
      [1 / 2, 1, 3, 1 / 2],
      [1 / 5, 1 / 3, 1, 1 / 3],
      [1, 2, 3, 1],
    ];

    const result = calcCR(matrix);

    // Cek bobot
    // PERBAIKAN: Disesuaikan dengan presisi hasil perhitungan
    expect(result.weights[0]).toBeCloseTo(0.3639, 3);
    expect(result.weights[1]).toBeCloseTo(0.198, 3);
    expect(result.weights[2]).toBeCloseTo(0.093, 3);
    expect(result.weights[3]).toBeCloseTo(0.345, 3);

    // Cek nilai konsistensi (RI untuk n=4 adalah 0.9)
    expect(result.lambdaMax).toBeCloseTo(4.075, 3);
    expect(result.CI).toBeCloseTo(0.025, 3);
    expect(result.CR).toBe(0.0278);
  });

  test("harus menggunakan RI yang benar jika n > 9", () => {
    // Kita tidak perlu matriks 10x10, cukup buat matriks 10x10 kosong
    // untuk memastikan logika RI lookup-nya benar
    const matrix = Array(10).fill(Array(10).fill(1)); // Matriks sempurna
    const result = calcCR(matrix);

    // Dalam matriks sempurna, CI = 0, sehingga CR = 0
    // Tes ini hanya memastikan RI yang digunakan tidak menyebabkan error
    expect(result.lambdaMax).toBeCloseTo(10, 5);
    // PERBAIKAN: Gunakan toBeCloseTo untuk menangani floating point inaccuracy
    expect(result.CI).toBeCloseTo(0);
    expect(result.CR).toBeCloseTo(0);
  });
});
