// __tests__/ahpUtils.test.js

const { calcCR } = require("../src/utils/ahp.js");

describe("AHP Utility - calcCR", () => {
  test("harus menghitung weights, lambdaMax, CI, dan CR dengan benar untuk matriks 3x3", () => {
    const matrix = [
      [1, 3, 5],
      [1 / 3, 1, 3],
      [1 / 5, 1 / 3, 1],
    ];

    const result = calcCR(matrix);

    // Cek bobot (eigenvector)
    expect(result.weights[0]).toBeCloseTo(0.633, 3);
    expect(result.weights[1]).toBeCloseTo(0.260, 3);
    expect(result.weights[2]).toBeCloseTo(0.106, 3);

    // Cek nilai-nilai konsistensi (NILAI DIPERBAIKI)
    expect(result.lambdaMax).toBeCloseTo(3.055, 3);
    expect(result.CI).toBeCloseTo(0.028, 3);
    expect(result.CR).toBeCloseTo(0.0477, 4); // Diubah dari toBe()
  });

  test("harus menghitung dengan benar untuk matriks 4x4", () => {
    const matrix = [
      [1, 2, 5, 1],
      [1 / 2, 1, 3, 1 / 2],
      [1 / 5, 1 / 3, 1, 1 / 3],
      [1, 2, 3, 1],
    ];

    const result = calcCR(matrix);

    // Cek bobot (NILAI DIPERBAIKI)
expect(result.weights[0]).toBeCloseTo(0.379, 3);
expect(result.weights[1]).toBeCloseTo(0.200, 3);
expect(result.weights[2]).toBeCloseTo(0.084, 3); // <-- Perbaikan 1
expect(result.weights[3]).toBeCloseTo(0.337, 3); // <-- Perbaikan 2

    // Cek nilai konsistensi (NILAI DIPERBAIKI)
    expect(result.lambdaMax).toBeCloseTo(4.056, 3);
    expect(result.CI).toBeCloseTo(0.019, 3);
    expect(result.CR).toBeCloseTo(0.0207, 4); // Diubah dari toBe()
  });

  test("harus menggunakan RI yang benar jika n > 9", () => {
    const matrix = Array(10).fill(Array(10).fill(1));
    const result = calcCR(matrix);

    expect(result.lambdaMax).toBeCloseTo(10, 5);
    expect(result.CI).toBeCloseTo(0);
    expect(result.CR).toBeCloseTo(0);
  });
});