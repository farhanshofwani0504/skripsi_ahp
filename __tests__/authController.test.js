// Impor fungsi-fungsi yang akan diuji
const { register, login, forgotPassword, resetPassword } = require("../src/controllers/authController.js");

// Impor modul yang akan di-mock
const prisma = require("../src/config/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../src/services/emailService");

// Mock semua modul yang dibutuhkan
jest.mock("../src/config/prismaClient", () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => "mockResetToken") })),
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({ digest: jest.fn(() => "mockHashedToken") })),
  })),
}));
jest.mock("../src/services/emailService", () => ({
  sendEmail: jest.fn(),
}));

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

// --- Kumpulan Tes untuk Fungsi Forgot Password ---
describe("Forgot Password Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: { email: "user@example.com" },
      protocol: "http",
      get: jest.fn(() => "localhost:3000"),
    };
    responseJson = jest.fn();
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: responseJson,
    };
    process.env.FRONTEND_URL = "http://localhost:5173";
  });

  test("harus berhasil mengirim email reset password", async () => {
    const mockUser = { id: 1, email: "user@example.com" };
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);
    emailService.sendEmail.mockResolvedValue(true);

    await forgotPassword(mockRequest, mockResponse);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(emailService.sendEmail).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(responseJson).toHaveBeenCalledWith({ message: "Email reset password berhasil dikirim." });
  });

  test("harus mengembalikan status 404 jika user tidak ditemukan", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await forgotPassword(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(responseJson).toHaveBeenCalledWith({ error: "User dengan email tersebut tidak ditemukan." });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  test("harus mengembalikan status 500 jika ada masalah saat mengirim email", async () => {
    const mockUser = { id: 1, email: "user@example.com" };
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);
    emailService.sendEmail.mockRejectedValue(new Error("Failed to send email"));

    await forgotPassword(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: "Ada masalah saat mengirim email. Silakan coba lagi nanti." });
    expect(prisma.user.update).toHaveBeenCalledTimes(2); // Sekali untuk menyimpan token, sekali untuk menghapus token
  });

  test("harus mengembalikan status 500 jika terjadi error database", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("DB Error"));

    await forgotPassword(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: "DB Error" });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});

// --- Kumpulan Tes untuk Fungsi Reset Password ---
describe("Reset Password Controller", () => {
  let mockRequest;
  let mockResponse;
  let responseJson;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      params: { token: "mockResetToken" },
      body: { password: "newPassword123" },
    };
    responseJson = jest.fn();
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: responseJson,
    };
  });

  test("harus berhasil mereset password", async () => {
    const mockUser = { id: 1, email: "user@example.com", resetPasswordToken: "mockHashedToken", resetPasswordExpires: new Date(Date.now() + 3600000) };
    prisma.user.findFirst.mockResolvedValue(mockUser);
    bcrypt.hash.mockResolvedValue("newHashedPassword");
    prisma.user.update.mockResolvedValue(mockUser);

    await resetPassword(mockRequest, mockResponse);

    expect(prisma.user.findFirst).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith("newPassword123", 10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        password: "newHashedPassword",
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(responseJson).toHaveBeenCalledWith({ message: "Password berhasil direset." });
  });

  test("harus mengembalikan status 400 jika token tidak valid atau sudah kadaluarsa", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await resetPassword(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({ error: "Token tidak valid atau sudah kadaluarsa." });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test("harus mengembalikan status 500 jika terjadi error database", async () => {
    prisma.user.findFirst.mockRejectedValue(new Error("DB Error"));

    await resetPassword(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({ error: "DB Error" });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
