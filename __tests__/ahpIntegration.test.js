const { calcCR } = require("../src/utils/ahp.js");

describe("Integrasi AHP dengan Perhitungan Skor Karyawan", () => {
  
  test("Test 1: Verifikasi perhitungan skor tertimbang dengan bobot AHP", () => {
    // Simulasi bobot AHP untuk 5 kriteria (sesuai dengan aplikasi)
    const bobotAHP = [0.2, 0.2, 0.2, 0.2, 0.2]; // Bobot seimbang
    const nilaiKaryawan = [4.5, 3.8, 4.2, 4.0, 3.9]; // Nilai untuk 5 kriteria
    
    // Hitung skor tertimbang
    const skorTertimbang = nilaiKaryawan.reduce((total, nilai, index) => {
      return total + (nilai * bobotAHP[index]);
    }, 0);

    // Validasi perhitungan manual
    const expectedScore = (4.5 * 0.2) + (3.8 * 0.2) + (4.2 * 0.2) + (4.0 * 0.2) + (3.9 * 0.2);
    expect(skorTertimbang).toBeCloseTo(expectedScore, 3);
    expect(skorTertimbang).toBeCloseTo(4.08, 3); // Rata-rata tertimbang

    console.log("Test 1 Results:", {
      bobotAHP,
      nilaiKaryawan,
      skorTertimbang,
      expectedScore,
      rataRataSederhana: nilaiKaryawan.reduce((a, b) => a + b, 0) / nilaiKaryawan.length
    });
  });

  test("Test 2: Verifikasi perhitungan dengan bobot AHP yang tidak seimbang", () => {
    // Bobot AHP yang tidak seimbang (lebih realistis)
    const bobotAHP = [0.35, 0.25, 0.20, 0.15, 0.05]; // Total = 1.0
    const nilaiKaryawan = [4.5, 3.8, 4.2, 4.0, 3.9];
    
    // Hitung skor tertimbang
    const skorTertimbang = nilaiKaryawan.reduce((total, nilai, index) => {
      return total + (nilai * bobotAHP[index]);
    }, 0);

    // Validasi perhitungan manual
    const expectedScore = (4.5 * 0.35) + (3.8 * 0.25) + (4.2 * 0.20) + (4.0 * 0.15) + (3.9 * 0.05);
    expect(skorTertimbang).toBeCloseTo(expectedScore, 3);
    expect(skorTertimbang).toBeCloseTo(4.16, 3);

    console.log("Test 2 Results:", {
      bobotAHP,
      nilaiKaryawan,
      skorTertimbang,
      expectedScore,
      rataRataSederhana: nilaiKaryawan.reduce((a, b) => a + b, 0) / nilaiKaryawan.length
    });
  });

  test("Test 3: Verifikasi konsistensi bobot AHP", () => {
    // Test bahwa bobot AHP selalu berjumlah 1.0
    const bobotAHP = [0.35, 0.25, 0.20, 0.15, 0.05];
    const totalBobot = bobotAHP.reduce((sum, bobot) => sum + bobot, 0);
    
    expect(totalBobot).toBeCloseTo(1.0, 3);
    expect(totalBobot).toBeGreaterThan(0.99);
    expect(totalBobot).toBeLessThan(1.01);

    console.log("Test 3 Results:", {
      bobotAHP,
      totalBobot,
      isValid: totalBobot === 1.0
    });
  });

  test("Test 4: Simulasi perhitungan skor bulanan dengan AHP", () => {
    // Simulasi data penilaian bulanan untuk 3 bulan
    const bobotAHP = [0.3, 0.3, 0.2, 0.2]; // 4 kriteria
    
    const penilaianBulan1 = [4.5, 4.0, 3.8, 4.2];
    const penilaianBulan2 = [4.2, 4.1, 4.0, 3.9];
    const penilaianBulan3 = [4.0, 4.3, 4.1, 4.0];

    // Hitung skor tertimbang per bulan
    const hitungSkorBulan = (nilai) => {
      return nilai.reduce((total, n, index) => total + (n * bobotAHP[index]), 0);
    };

    const skorBulan1 = hitungSkorBulan(penilaianBulan1);
    const skorBulan2 = hitungSkorBulan(penilaianBulan2);
    const skorBulan3 = hitungSkorBulan(penilaianBulan3);

    // Rata-rata 3 bulan
    const rataRata3Bulan = (skorBulan1 + skorBulan2 + skorBulan3) / 3;

    expect(skorBulan1).toBeCloseTo(4.15, 3);
    expect(skorBulan2).toBeCloseTo(4.07, 3);
    expect(skorBulan3).toBeCloseTo(4.11, 3);
    expect(rataRata3Bulan).toBeCloseTo(4.11, 3);

    console.log("Test 4 Results:", {
      bobotAHP,
      penilaianBulan1,
      penilaianBulan2,
      penilaianBulan3,
      skorBulan1,
      skorBulan2,
      skorBulan3,
      rataRata3Bulan
    });
  });

  test("Test 5: Verifikasi perhitungan grade berdasarkan skor AHP", () => {
    // Fungsi grade yang sama dengan aplikasi
    const toGrade = (avg) => {
      if (avg >= 4.5) return "A";
      if (avg >= 3.5) return "B";
      if (avg >= 2.5) return "C";
      if (avg > 1.5) return "D";
      if (avg >= 0) return "E";
      return "N/A";
    };

    // Test berbagai skor
    const testCases = [
      { skor: 4.8, expectedGrade: "A" },
      { skor: 4.2, expectedGrade: "B" },
      { skor: 3.8, expectedGrade: "B" },
      { skor: 2.8, expectedGrade: "C" },
      { skor: 1.8, expectedGrade: "D" },
      { skor: 1.0, expectedGrade: "E" }
    ];

    testCases.forEach(({ skor, expectedGrade }) => {
      const grade = toGrade(skor);
      expect(grade).toBe(expectedGrade);
    });

    console.log("Test 5 Results:", {
      testCases: testCases.map(tc => ({ skor: tc.skor, grade: toGrade(tc.skor) }))
    });
  });

  test("Test 6: Verifikasi matriks AHP untuk 5 kriteria", () => {
    // Matriks pairwise comparison untuk 5 kriteria
    const matrix = [
      [1, 1, 1, 1, 1], // Semua kriteria sama penting
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1]
    ];

    const result = calcCR(matrix);

    // Validasi eigenvector berjumlah 1
    const sumWeights = result.weights.reduce((sum, weight) => sum + weight, 0);
    expect(sumWeights).toBeCloseTo(1, 3);

    // Untuk matriks yang semua elemennya 1, bobot harus sama
    result.weights.forEach(weight => {
      expect(weight).toBeCloseTo(0.2, 3); // 1/5 = 0.2
    });

    // CR harus 0 untuk matriks yang sempurna konsisten
    expect(result.CR).toBeCloseTo(0, 3);

    console.log("Test 6 Results:", {
      weights: result.weights,
      lambdaMax: result.lambdaMax,
      CI: result.CI,
      CR: result.CR,
      isConsistent: result.CR < 0.1
    });
  });
}); 