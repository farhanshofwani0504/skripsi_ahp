const { calcRollingAvg, toGrade } = require('../src/utils/score');

describe('toGrade', () => {
  it('mengembalikan A jika >= 4.5', () => {
    expect(toGrade(4.5)).toBe('A');
    expect(toGrade(5)).toBe('A');
  });
  it('mengembalikan B jika >= 3.5', () => {
    expect(toGrade(4.4)).toBe('B');
    expect(toGrade(3.5)).toBe('B');
  });
  it('mengembalikan C jika >= 2.5', () => {
    expect(toGrade(3.4)).toBe('C');
    expect(toGrade(2.5)).toBe('C');
  });
  it('mengembalikan D jika >= 1.5', () => {
    expect(toGrade(2.4)).toBe('D');
    expect(toGrade(1.5)).toBe('D');
  });
  it('mengembalikan E jika >= 1.0', () => {
    expect(toGrade(1.4)).toBe('E');
    expect(toGrade(1.0)).toBe('E');
  });
  it('mengembalikan N/A jika < 1.0', () => {
    expect(toGrade(0.9)).toBe('N/A');
    expect(toGrade(-5)).toBe('N/A');
  });
});

describe('calcRollingAvg', () => {
  it('mengembalikan rata-rata nilai jika ada data', async () => {
    const mockPrisma = {
      penilaian: {
        aggregate: jest.fn().mockResolvedValue({ _avg: { nilai: 3.5 } }),
      },
    };
    const avg = await calcRollingAvg(mockPrisma, 1);
    expect(avg).toBe(3.5);
  });
  it('mengembalikan 0 jika nilai null', async () => {
    const mockPrisma = {
      penilaian: {
        aggregate: jest.fn().mockResolvedValue({ _avg: { nilai: null } }),
      },
    };
    const avg = await calcRollingAvg(mockPrisma, 2);
    expect(avg).toBe(0);
  });
  it('mengembalikan 0 jika tidak ada data sama sekali', async () => {
    const mockPrisma = {
      penilaian: {
        aggregate: jest.fn().mockResolvedValue({ _avg: {} }),
      },
    };
    const avg = await calcRollingAvg(mockPrisma, 3);
    expect(avg).toBe(0);
  });
}); 