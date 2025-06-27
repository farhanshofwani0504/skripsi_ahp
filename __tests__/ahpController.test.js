// Impor fungsi yang akan diuji dari file controller Anda
// PATH DIPERBAIKI: Keluar dari folder __tests__, masuk ke src/controllers/
const {
  calculateAHP,
  saveAHPWeights,
} = require("../src/controllers/ahpController.js");

// Impor Prisma Client untuk di-mock.
// PATH DIPERBAIKI: Keluar dari folder __tests__, masuk ke src/config/
const prisma = require("../src/config/prismaClient");

// Memberitahu Jest untuk mengganti implementasi Prisma asli
// dengan versi mock/palsu secara otomatis.
// PATH DIPERBAIKI: Path di dalam jest.mock() juga harus benar.
jest.mock("../src/config/prismaClient", () => ({
  // Mock objek bobotKriteria dan semua metodenya
  bobotKriteria: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

// --- Kumpulan Tes untuk Fungsi calculateAHP ---
describe("calculateAHP Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson; // untuk menampung hasil dari res.json

  // Fungsi beforeEach akan dijalankan sebelum setiap tes di dalam 'describe' ini.
  // Ini bagus untuk mereset objek mock agar tes tidak saling mempengaruhi.
  beforeEach(() => {
    // Reset semua mock sebelum setiap tes
    jest.clearAllMocks();

    // Buat objek request palsu (mockRequest)
    mockRequest = {
      body: {}, // body akan diisi di setiap tes
    };

    // Buat objek response palsu (mockResponse)
    responseJson = jest.fn(); // Ini adalah mata-mata untuk res.json()
    mockResponse = {
      json: responseJson, // Menggunakan mata-mata di atas
      status: jest.fn(() => mockResponse), // Memungkinkan chaining seperti res.status(500).json()
    };
  });

  test("harus menghitung bobot prioritas dan CR dengan benar untuk matriks 3x3 yang konsisten", () => {
    // Siapkan data input untuk tes ini
    mockRequest.body.matrix = [
      [1, 3, 5],
      [1 / 3, 1, 3],
      [1 / 5, 1 / 3, 1],
    ];

    // Panggil fungsi controller yang asli dengan objek mock
    calculateAHP(mockRequest, mockResponse);

    // Dapatkan hasil yang dikirim melalui res.json()
    const result = responseJson.mock.calls[0][0];

    // Lakukan Pengecekan (Assertion) dengan nilai yang sudah dikoreksi
    // priorities harus mendekati nilai yang diharapkan
    expect(result.priorities[0]).toBeCloseTo(0.633, 3);
    expect(result.priorities[1]).toBeCloseTo(0.26, 3);
    expect(result.priorities[2]).toBeCloseTo(0.106, 3);

    // Nilai lain harus mendekati nilai yang diharapkan
    expect(result.lambdaMax).toBeCloseTo(3.038, 2);
    expect(result.CI).toBeCloseTo(0.019, 2);
    expect(result.CR).toBeCloseTo(0.033, 2);
    expect(result.isConsistent).toBe(true);
  });

  test("harus menandai isConsistent sebagai false jika CR >= 0.1", () => {
    // Matriks ini sengaja dibuat sangat tidak konsisten untuk memastikan CR > 0.1
    mockRequest.body.matrix = [
      [1, 9, 1 / 9],
      [1 / 9, 1, 9],
      [9, 1 / 9, 1],
    ];

    calculateAHP(mockRequest, mockResponse);
    const result = responseJson.mock.calls[0][0];

    // Pengecekan harus berhasil dengan matriks baru ini
    expect(result.CR).toBeGreaterThanOrEqual(0.1);
    expect(result.isConsistent).toBe(false);
  });
});

// --- Kumpulan Tes untuk Fungsi saveAHPWeights ---
describe("saveAHPWeights Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    jest.clearAllMocks(); // Membersihkan histori panggilan mock dari tes sebelumnya
    mockRequest = {
      body: {
        weights: [
          { kriteriaId: 1, bobot: 0.6 },
          { kriteriaId: 2, bobot: 0.4 },
        ],
      },
    };
    responseJson = jest.fn();
    mockResponse = {
      json: responseJson,
      status: jest.fn(() => mockResponse),
    };
  });

  test("harus meng-update bobot jika kriteria sudah ada", async () => {
    const existingWeight = { id: 99, kriteriaId: 1, bobot: 0.5 };
    const updatedWeight = { id: 99, kriteriaId: 1, bobot: 0.6 };

    // Atur perilaku mock: jika findFirst dipanggil, kembalikan 'existingWeight'
    prisma.bobotKriteria.findFirst
      .mockResolvedValueOnce(existingWeight) // untuk kriteriaId: 1
      .mockResolvedValueOnce(null); // untuk kriteriaId: 2 (dibuat baru)

    // Atur perilaku mock: jika update dipanggil, kembalikan 'updatedWeight'
    prisma.bobotKriteria.update.mockResolvedValue(updatedWeight);
    prisma.bobotKriteria.create.mockResolvedValue({
      id: 100,
      kriteriaId: 2,
      bobot: 0.4,
    });

    // Panggil fungsi yang akan diuji
    await saveAHPWeights(mockRequest, mockResponse);

    // Pengecekan
    expect(prisma.bobotKriteria.findFirst).toHaveBeenCalledWith({
      where: { kriteriaId: 1 },
    });
    expect(prisma.bobotKriteria.update).toHaveBeenCalledWith({
      where: { id: existingWeight.id },
      data: { bobot: 0.6 },
    });
    expect(prisma.bobotKriteria.create).toHaveBeenCalledTimes(1); // Dipanggil untuk kriteriaId 2
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Bobot disimpan" })
    );
  });

  test("harus membuat bobot baru jika kriteria belum ada", async () => {
    // Atur perilaku mock: findFirst selalu mengembalikan null (tidak ada data)
    prisma.bobotKriteria.findFirst.mockResolvedValue(null);
    prisma.bobotKriteria.create.mockImplementation((data) =>
      Promise.resolve({ id: Math.random(), ...data.data })
    );

    await saveAHPWeights(mockRequest, mockResponse);

    // Pengecekan
    expect(prisma.bobotKriteria.findFirst).toHaveBeenCalledTimes(2); // dicek untuk kedua kriteria
    expect(prisma.bobotKriteria.create).toHaveBeenCalledTimes(2); // dibuat untuk kedua kriteria
    expect(prisma.bobotKriteria.update).not.toHaveBeenCalled(); // update tidak boleh dipanggil
  });

  test("harus mengembalikan status 500 jika terjadi error pada database", async () => {
    const errorMessage = "Database connection lost";
    // Atur perilaku mock: findFirst akan melempar error
    prisma.bobotKriteria.findFirst.mockRejectedValue(new Error(errorMessage));

    await saveAHPWeights(mockRequest, mockResponse);

    // Pengecekan
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: errorMessage });
  });
});
