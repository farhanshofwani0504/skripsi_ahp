const { hitungSkor6Bulan } = require('../src/utils/skor');
const { PrismaClient } = require('@prisma/client');

jest.mock('@prisma/client');

const mockFindMany = jest.fn();
const mockUpdate = jest.fn();

PrismaClient.mockImplementation(() => ({
  penilaian: { findMany: mockFindMany },
  karyawan: { update: mockUpdate },
}));

// Tambahkan objek mockPrisma agar bisa dipakai sebagai dependency injection
defineMockPrisma();
function defineMockPrisma() {
  global.mockPrisma = {
    penilaian: { findMany: mockFindMany },
    karyawan: { update: mockUpdate },
  };
}

describe('hitungSkor6Bulan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defineMockPrisma();
  });

  it('mengupdate skor rata-rata berbobot dari beberapa bulan', async () => {
    // Data: 2 bulan, masing-masing 1 penilaian, bobot 2 dan 3
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);
    mockFindMany.mockResolvedValue([
      {
        createdAt: now,
        nilai: 4,
        kriteria: { bobotKriteria: { bobot: 2 } },
      },
      {
        createdAt: lastMonth,
        nilai: 3,
        kriteria: { bobotKriteria: { bobot: 3 } },
      },
    ]);
    mockUpdate.mockResolvedValue({});

    await hitungSkor6Bulan(1, mockPrisma);
    // Skor bulan1: 2*4=8, bulan2: 3*3=9, rata2: (8+9)/2=8.5
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { skor: 8.5 },
    });
  });

  it('mengupdate skor 0 jika tidak ada penilaian', async () => {
    mockFindMany.mockResolvedValue([]);
    mockUpdate.mockResolvedValue({});
    await hitungSkor6Bulan(2, mockPrisma);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { skor: 0 },
    });
  });

  it('mengupdate skor jika semua penilaian di bulan yang sama', async () => {
    const now = new Date();
    mockFindMany.mockResolvedValue([
      {
        createdAt: now,
        nilai: 2,
        kriteria: { bobotKriteria: { bobot: 1 } },
      },
      {
        createdAt: now,
        nilai: 3,
        kriteria: { bobotKriteria: { bobot: 2 } },
      },
    ]);
    mockUpdate.mockResolvedValue({});
    await hitungSkor6Bulan(3, mockPrisma);
    // Satu bulan: (1*2)+(2*3)=2+6=8, rata2=8
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { skor: 8 },
    });
  });
}); 