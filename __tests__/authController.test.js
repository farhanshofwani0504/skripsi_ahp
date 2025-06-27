// Impor fungsi-fungsi yang akan diuji
const { register, login } = require("../src/controllers/authController.js");

// Impor modul yang akan di-mock
const prisma = require("../src/config/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock semua modul yang dibutuhkan
jest.mock("../src/config/prismaClient", () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

// --- Kumpulan Tes untuk Fungsi Register ---
describe("Register Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    // Reset semua mock sebelum tiap tes
    jest.clearAllMocks();

    mockRequest = {
      body: {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      },
    };
    responseJson = jest.fn();
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: responseJson,
    };
  });

  test("harus berhasil membuat user baru dengan status 201", async () => {
    const mockUser = { id: 1, username: "testuser", email: "test@example.com" };
    const hashedPassword = "hashedpassword";

    // Atur perilaku mock
    bcrypt.hash.mockResolvedValue(hashedPassword);
    prisma.user.create.mockResolvedValue(mockUser);

    await register(mockRequest, mockResponse);

    // Pengecekan
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "testuser",
        email: "test@example.com",
        password: hashedPassword,
        role: "admin",
      },
    });
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(responseJson).toHaveBeenCalledWith({
      message: "User created",
      user: mockUser,
    });
  });

  test("harus mengembalikan status 400 jika ada field yang kosong", async () => {
    mockRequest.body.password = ""; // Kosongkan salah satu field

    await register(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({
      error: "Semua field wajib diisi",
    });
    expect(prisma.user.create).not.toHaveBeenCalled(); // Pastikan create tidak dipanggil
  });

  test("harus mengembalikan status 500 jika terjadi error database", async () => {
    const dbError = new Error(
      "Unique constraint failed on the fields: (`email`)"
    );
    bcrypt.hash.mockResolvedValue("hashedpassword");
    prisma.user.create.mockRejectedValue(dbError); // Simulasikan error dari Prisma

    await register(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: dbError.message });
  });
});

// --- Kumpulan Tes untuk Fungsi Login ---
describe("Login Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: {
        email: "user@example.com",
        password: "password123",
      },
    };
    responseJson = jest.fn();
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: responseJson,
    };
    // Set mock environment variable untuk JWT
    process.env.JWT_SECRET = "secret-key-for-testing";
  });

  test("harus berhasil login dan mengembalikan token", async () => {
    const mockUser = {
      id: 1,
      email: "user@example.com",
      password: "hashedpassword",
      role: "admin",
    };
    const mockToken = "mock-jwt-token";

    // Atur perilaku mock
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true); // Password cocok
    jwt.sign.mockReturnValue(mockToken);

    await login(mockRequest, mockResponse);

    // Pengecekan
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashedpassword"
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: mockUser.id, role: mockUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    expect(responseJson).toHaveBeenCalledWith({
      message: "Login sukses",
      token: mockToken,
    });
  });

  test("harus gagal login dengan status 401 jika user tidak ditemukan", async () => {
    prisma.user.findUnique.mockResolvedValue(null); // User tidak ada

    await login(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseJson).toHaveBeenCalledWith({
      error: "User tidak ditemukan",
    });
  });

  test("harus gagal login dengan status 401 jika password salah", async () => {
    const mockUser = { id: 1, password: "hashedpassword" };
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false); // Password tidak cocok

    await login(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseJson).toHaveBeenCalledWith({ error: "Password salah" });
  });

  test("harus mengembalikan status 400 jika email atau password kosong", async () => {
    mockRequest.body.email = ""; // Kosongkan email

    await login(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({
      error: "Email dan password wajib diisi",
    });
  });
});
