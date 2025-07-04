// Impor fungsi yang akan diuji dari file controller Anda
const { calculateAHP } = require("../src/controllers/ahpController.js");

// Impor modul yang akan di-mock
const prisma = require("../src/config/prismaClient");
const ahpService = require("../src/services/ahpService");
const ahpUtils = require("../src/utils/ahp");

// Memberitahu Jest untuk mengganti implementasi Prisma asli
jest.mock("../src/config/prismaClient", () => ({
  bobotKriteria: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((operations) => Promise.all(operations)),
}));
jest.mock("../src/services/ahpService", () => ({
  recalculateAHP: jest.fn(),
}));
jest.mock("../src/utils/ahp", () => ({
  calcCR: jest.fn(),
}));

// --- Kumpulan Tes untuk Fungsi calculateAHP ---
describe("calculateAHP Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {}, // body akan diisi di setiap tes
    };

    responseJson = jest.fn();
    mockResponse = {
      json: responseJson,
      status: jest.fn(() => mockResponse),
    };

    // Mock default untuk calcCR
    ahpUtils.calcCR.mockReturnValue({
      weights: [0.633, 0.26, 0.106],
      lambdaMax: 3.038,
      CI: 0.019,
      CR: 0.033,
    });
    // Mock default untuk recalculateAHP
    ahpService.recalculateAHP.mockResolvedValue(0.033);
  });

  test("harus menghitung bobot prioritas dan CR dengan benar untuk matriks 3x3 yang konsisten", async () => {
    mockRequest.body.matrix = [
      [1, 3, 5],
      [1 / 3, 1, 3],
      [1 / 5, 1 / 3, 1],
    ];
    mockRequest.body.kriteriaIds = [1, 2, 3];

    await calculateAHP(mockRequest, mockResponse);

    expect(ahpUtils.calcCR).toHaveBeenCalledWith(mockRequest.body.matrix);
    expect(ahpService.recalculateAHP).toHaveBeenCalledWith(
      mockRequest.body.matrix,
      mockRequest.body.kriteriaIds
    );

    const result = responseJson.mock.calls[0][0];

    expect(result.priorities[0]).toBeCloseTo(0.633, 3);
    expect(result.priorities[1]).toBeCloseTo(0.26, 3);
    expect(result.priorities[2]).toBeCloseTo(0.106, 3);
    expect(result.lambdaMax).toBeCloseTo(3.038, 2);
    expect(result.CI).toBeCloseTo(0.019, 2);
    expect(result.CR).toBeCloseTo(0.033, 2);
    expect(result.isConsistent).toBe(true);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });

  test("harus menandai isConsistent sebagai false jika CR >= 0.1", async () => {
    mockRequest.body.matrix = [
      [1, 9, 1 / 9],
      [1 / 9, 1, 9],
      [9, 1 / 9, 1],
    ];
    mockRequest.body.kriteriaIds = [1, 2, 3];

    ahpUtils.calcCR.mockReturnValue({
      weights: [0.5, 0.3, 0.2],
      lambdaMax: 3.5,
      CI: 0.25,
      CR: 0.5, // CR > 0.1
    });

    await calculateAHP(mockRequest, mockResponse);
    const result = responseJson.mock.calls[0][0];

    expect(result.CR).toBeCloseTo(0.5, 2);
    expect(result.isConsistent).toBe(false);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });

  test("harus mengembalikan status 400 jika matrix atau kriteriaIds kosong", async () => {
    mockRequest.body = { matrix: [], kriteriaIds: [] };

    await calculateAHP(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({
      error: "Matrix dan Kriteria IDs wajib diisi dan dalam format yang benar.",
    });
    expect(ahpUtils.calcCR).not.toHaveBeenCalled();
    expect(ahpService.recalculateAHP).not.toHaveBeenCalled();
  });

  test("harus mengembalikan status 400 jika jumlah kriteria dalam matrix tidak sesuai dengan kriteriaIds", async () => {
    mockRequest.body = {
      matrix: [
        [1, 2],
        [1 / 2, 1],
      ],
      kriteriaIds: [1, 2, 3], // Tidak cocok dengan matrix 2x2
    };

    await calculateAHP(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({
      error: "Jumlah kriteria dalam matrix tidak sesuai dengan jumlah kriteriaIds.",
    });
    expect(ahpUtils.calcCR).not.toHaveBeenCalled();
    expect(ahpService.recalculateAHP).not.toHaveBeenCalled();
  });

  test("harus mengembalikan status 500 jika terjadi error pada service", async () => {
    mockRequest.body.matrix = [
      [1, 3, 5],
      [1 / 3, 1, 3],
      [1 / 5, 1 / 3, 1],
    ];
    mockRequest.body.kriteriaIds = [1, 2, 3];

    ahpService.recalculateAHP.mockRejectedValue(new Error("Service Error"));

    await calculateAHP(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: "Service Error" });
  });
});
