// __tests__/reportService.test.js

const { generateKaryawanReportPDF } = require("../src/services/reportService");
const { toGrade } = require("../src/utils/score");

// ==========================================================
// MOCKING DEPENDENSI
// ==========================================================
// Kita mock 'pdfkit-table' untuk mencegah pembuatan PDF sungguhan
// dan untuk "mengintip" apakah fungsi-fungsinya dipanggil dengan benar.
const mockTableFn = jest.fn();
const mockTextFn = jest.fn();
const mockPipeFn = jest.fn();
const mockFontSizeFn = jest.fn();
const mockFontFn = jest.fn();
const mockMoveDownFn = jest.fn();

// Mock untuk pdfkit-table
jest.mock("pdfkit-table", () => {
  return jest.fn().mockImplementation(() => {
    const mockDoc = {
      on: jest.fn(),
      pipe: mockPipeFn,
      fontSize: mockFontSizeFn.mockReturnThis(),
      font: mockFontFn.mockReturnThis(),
      text: mockTextFn.mockReturnThis(),
      moveDown: mockMoveDownFn.mockReturnThis(),
      table: mockTableFn,
      end: jest.fn(),
      page: { // Tambahkan mock page object
        height: 792, // Contoh tinggi halaman standar (Letter size)
        margins: { bottom: 72 }, // Contoh margin bawah standar
      },
    };
    
    // Simpan callback 'end' saat .on() dipanggil
    mockDoc.on.mockImplementation((event, callback) => {
      if (event === "end") {
        mockDoc.end.mockImplementation(() => {
          callback();
        });
      }
    });
    
    return mockDoc;
  });
});

// Kita mock 'toGrade' agar bisa mengontrol outputnya
jest.mock("../src/utils/score", () => ({
  toGrade: jest.fn(),
}));

// ==========================================================
// BLOK TES
// ==========================================================
describe("generateKaryawanReportPDF", () => {
  // Bersihkan semua mock sebelum setiap tes
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Data dummy untuk digunakan di semua tes
  const mockKaryawan = {
    nama: "Iqsan",
    posisi: "Developer",
    email: "iqsan@example.com",
    startDate: new Date("2024-01-01"),
    penilaian: [
      {
        kriteria: { nama: "Kualitas Kode" },
        nilai: 4.5,
        createdAt: new Date("2025-06-10"),
      },
      {
        kriteria: { nama: "Kerjasama Tim" },
        nilai: 4.0,
        createdAt: new Date("2025-06-15"),
      },
      {
        kriteria: { nama: "Kualitas Kode" },
        nilai: 3.5,
        createdAt: new Date("2025-05-20"),
      },
    ],
  };

  test("harus membuat laporan PDF dengan benar saat data penilaian ada", async () => {
    // Atur mock toGrade untuk mengembalikan nilai A & B
    toGrade.mockImplementation((avg) => {
      if (avg > 4) return "A";
      return "B";
    });

    // Panggil fungsi yang diuji
    const pdfBuffer = await generateKaryawanReportPDF(mockKaryawan);

    // Lakukan Pengecekan (Assertions)
    expect(pdfBuffer).toBeInstanceOf(Buffer); // 1. Pastikan outputnya adalah Buffer

    // 2. Pastikan informasi karyawan ditulis dengan benar
    expect(mockTextFn).toHaveBeenCalledWith(`Nama: ${mockKaryawan.nama}`);
    expect(mockTextFn).toHaveBeenCalledWith(`Posisi: ${mockKaryawan.posisi}`);

    // 3. Pastikan 'table' dipanggil 2 kali (untuk bulan Juni dan Mei)
    expect(mockTableFn).toHaveBeenCalledTimes(2);

    // 4. Periksa panggilan pertama untuk tabel bulan Juni
    const juniTableCall = mockTableFn.mock.calls[0][0]; // Ambil argumen pertama dari panggilan pertama
    expect(juniTableCall.title).toBe("June 2025");
    expect(juniTableCall.rows).toEqual([
      ["Kualitas Kode", "4.50"],
      ["Kerjasama Tim", "4.00"],
    ]);

    // 5. Pastikan rekap & grade bulan Juni ditulis
    expect(mockTextFn).toHaveBeenCalledWith("Rata-rata Bulan Ini: 4.25");
    expect(mockTextFn).toHaveBeenCalledWith("Grade Bulan Ini: A");
  });

  test('harus menulis "Belum ada data" jika array penilaian kosong', async () => {
    const karyawanTanpaNilai = { ...mockKaryawan, penilaian: [] };

    // Panggil fungsi
    await generateKaryawanReportPDF(karyawanTanpaNilai);

    // Lakukan Pengecekan
    // 1. Pastikan fungsi table TIDAK pernah dipanggil
    expect(mockTableFn).not.toHaveBeenCalled();

    // 2. Pastikan pesan "data kosong" yang ditulis
    expect(mockTextFn).toHaveBeenCalledWith(
      "Belum ada data penilaian yang tercatat."
    );
  });

  test('harus membuat tabel untuk lebih dari satu bulan dan grade berbeda', async () => {
    toGrade.mockImplementation((avg) => {
      if (avg > 4) return "A";
      if (avg > 3) return "B";
      return "C";
    });
    const mockKaryawanMultiBulan = {
      nama: "Intan",
      posisi: "QA",
      email: "intan@example.com",
      startDate: new Date("2023-01-01"),
      penilaian: [
        { kriteria: { nama: "Kedisiplinan" }, nilai: 4.8, createdAt: new Date("2025-06-10") },
        { kriteria: { nama: "Kerjasama" }, nilai: 3.2, createdAt: new Date("2025-05-10") },
      ],
    };
    await generateKaryawanReportPDF(mockKaryawanMultiBulan);
    // Tabel dipanggil 2x (Juni, Mei)
    expect(mockTableFn).toHaveBeenCalledTimes(2);
    // Grade bulan Juni: 4.8 -> A, Mei: 3.2 -> B
    expect(mockTextFn).toHaveBeenCalledWith("Grade Bulan Ini: A");
    expect(mockTextFn).toHaveBeenCalledWith("Grade Bulan Ini: B");
  });

  test('harus menulis grade N/A jika rata-rata < 1.0', async () => {
    toGrade.mockReturnValue("N/A");
    const mockKaryawanLow = {
      nama: "Roki",
      posisi: "Staff",
      email: "roki@example.com",
      startDate: new Date("2022-01-01"),
      penilaian: [
        { kriteria: { nama: "Kedisiplinan" }, nilai: 0.5, createdAt: new Date("2025-06-10") },
      ],
    };
    await generateKaryawanReportPDF(mockKaryawanLow);
    expect(mockTextFn).toHaveBeenCalledWith("Grade Bulan Ini: N/A");
  });
});