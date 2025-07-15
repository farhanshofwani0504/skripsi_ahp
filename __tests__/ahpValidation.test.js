const { calcCR } = require("../src/utils/ahp.js");

describe("Validasi Perhitungan AHP", () => {
  
  test("Test 1: Matriks 3x3 - Validasi perhitungan eigenvector dan konsistensi", () => {
    // Matriks pairwise comparison 3x3 yang konsisten
    const matrix = [
      [1, 3, 5],
      [1/3, 1, 3],
      [1/5, 1/3, 1]
    ];

    const result = calcCR(matrix);

    // Validasi eigenvector (weights) - harus berjumlah 1
    const sumWeights = result.weights.reduce((sum, weight) => sum + weight, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    // Validasi nilai eigenvector yang diharapkan
    expect(result.weights[0]).toBeCloseTo(0.633, 3); // Kriteria 1
    expect(result.weights[1]).toBeCloseTo(0.260, 3); // Kriteria 2  
    expect(result.weights[2]).toBeCloseTo(0.106, 3); // Kriteria 3

    // Validasi λ_max (lambda max)
    expect(result.lambdaMax).toBeCloseTo(3.055, 3);

    // Validasi CI (Consistency Index)
    expect(result.CI).toBeCloseTo(0.028, 3);

    // Validasi CR (Consistency Ratio) - harus < 0.1 untuk konsisten
    expect(result.CR).toBeCloseTo(0.048, 3);
    expect(result.CR).toBeLessThan(0.1);

    console.log("Test 1 Results:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });

  test("Test 2: Matriks 4x4 - Validasi perhitungan untuk 4 kriteria", () => {
    // Matriks pairwise comparison 4x4
    const matrix = [
      [1, 2, 5, 1],
      [1/2, 1, 3, 1/2],
      [1/5, 1/3, 1, 1/3],
      [1, 2, 3, 1]
    ];

    const result = calcCR(matrix);

    // Validasi eigenvector berjumlah 1
    const sumWeights = result.weights.reduce((sum, weight) => sum + weight, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    // Validasi nilai eigenvector yang diharapkan
    expect(result.weights[0]).toBeCloseTo(0.379, 3);
    expect(result.weights[1]).toBeCloseTo(0.200, 3);
    expect(result.weights[2]).toBeCloseTo(0.084, 3);
    expect(result.weights[3]).toBeCloseTo(0.337, 3);

    // Validasi λ_max
    expect(result.lambdaMax).toBeCloseTo(4.056, 3);

    // Validasi CI
    expect(result.CI).toBeCloseTo(0.019, 3);

    // Validasi CR
    expect(result.CR).toBeCloseTo(0.021, 3);
    expect(result.CR).toBeLessThan(0.1);

    console.log("Test 2 Results:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });

  test("Test 3: Matriks tidak konsisten - CR harus > 0.1", () => {
    // Matriks yang tidak konsisten (CR > 0.1)
    const matrix = [
      [1, 9, 1/9],
      [1/9, 1, 9],
      [9, 1/9, 1]
    ];

    const result = calcCR(matrix);

    // Validasi eigenvector berjumlah 1
    const sumWeights = result.weights.reduce((sum, weight) => sum + weight, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    // Validasi CR > 0.1 (tidak konsisten)
    expect(result.CR).toBeGreaterThan(0.1);

    console.log("Test 3 Results:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });

  test("Test 4: Validasi RI Table untuk berbagai ukuran matriks", () => {
    // Test untuk matriks 3x3
    const matrix3x3 = [
      [1, 2, 3],
      [1/2, 1, 2],
      [1/3, 1/2, 1]
    ];
    const result3x3 = calcCR(matrix3x3);
    expect(result3x3.CR).toBeGreaterThanOrEqual(0);

    // Test untuk matriks 4x4
    const matrix4x4 = [
      [1, 2, 3, 4],
      [1/2, 1, 2, 3],
      [1/3, 1/2, 1, 2],
      [1/4, 1/3, 1/2, 1]
    ];
    const result4x4 = calcCR(matrix4x4);
    expect(result4x4.CR).toBeGreaterThanOrEqual(0);

    console.log("Test 4 Results:", {
      "3x3 CR": result3x3.CR,
      "4x4 CR": result4x4.CR
    });
  });

  test("Test 5: Validasi perhitungan skor akhir dengan bobot AHP", () => {
    // Simulasi data penilaian karyawan
    const bobotAHP = [0.633, 0.260, 0.106]; // Bobot dari matriks 3x3
    const nilaiKaryawan = [4.5, 3.8, 4.2]; // Nilai untuk 3 kriteria
    
    // Hitung skor tertimbang
    const skorTertimbang = nilaiKaryawan.reduce((total, nilai, index) => {
      return total + (nilai * bobotAHP[index]);
    }, 0);

    // Validasi perhitungan
    const expectedScore = (4.5 * 0.633) + (3.8 * 0.260) + (4.2 * 0.106);
    expect(skorTertimbang).toBeCloseTo(expectedScore, 3);
    expect(skorTertimbang).toBeGreaterThan(0);

    console.log("Test 5 Results:", {
      bobotAHP,
      nilaiKaryawan,
      skorTertimbang,
      expectedScore
    });
  });

  test("Simulasi AHP 5 kriteria (5x5) - bobot dan CR", () => {
    // Contoh matriks pairwise 5x5 (semakin ke bawah, kriteria makin kurang penting)
    const matrix = [
      [1,   3,   5,   7,   9],
      [1/3, 1,   3,   5,   7],
      [1/5, 1/3, 1,   3,   5],
      [1/7, 1/5, 1/3, 1,   3],
      [1/9, 1/7, 1/5, 1/3, 1]
    ];

    const result = calcCR(matrix);

    // Bobot harus berjumlah 1
    const sumWeights = result.weights.reduce((sum, w) => sum + w, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    // CR harus < 0.1 agar konsisten (untuk matriks ini biasanya masih konsisten)
    expect(result.CR).toBeLessThan(0.1);

    console.log("Simulasi 5 Kriteria:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });

  test("Simulasi AHP 5x5 - matriks custom user", () => {
    const matrix = [
      [1,   2,   3,   4,   2],
      [1/2, 1,   2,   3,   2],
      [1/3, 1/2, 1,   2,   2],
      [1/4, 1/3, 1/2, 1,   2],
      [1/2, 1/2, 1/2, 1/2, 1],
    ];

    const result = calcCR(matrix);
    const sumWeights = result.weights.reduce((sum, w) => sum + w, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    console.log("Laporan Matriks Custom 5x5:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });
}); 