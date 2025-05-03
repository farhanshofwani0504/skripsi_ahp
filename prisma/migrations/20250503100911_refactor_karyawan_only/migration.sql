-- CreateTable
CREATE TABLE "Karyawan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "posisi" TEXT NOT NULL,
    "email" TEXT,
    "skor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penilaian" (
    "id" SERIAL NOT NULL,
    "karyawanId" INTEGER NOT NULL,
    "kriteriaId" INTEGER NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kriteria" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Kriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BobotKriteria" (
    "id" SERIAL NOT NULL,
    "kriteriaId" INTEGER NOT NULL,
    "bobot" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BobotKriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarningLog" (
    "id" SERIAL NOT NULL,
    "karyawanId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_email_key" ON "Karyawan"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Penilaian_karyawanId_kriteriaId_key" ON "Penilaian"("karyawanId", "kriteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kriteria_nama_key" ON "Kriteria"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "BobotKriteria_kriteriaId_key" ON "BobotKriteria"("kriteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_kriteriaId_fkey" FOREIGN KEY ("kriteriaId") REFERENCES "Kriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobotKriteria" ADD CONSTRAINT "BobotKriteria_kriteriaId_fkey" FOREIGN KEY ("kriteriaId") REFERENCES "Kriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarningLog" ADD CONSTRAINT "WarningLog_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
