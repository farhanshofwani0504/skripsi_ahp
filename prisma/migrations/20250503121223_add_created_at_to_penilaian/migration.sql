/*
  Warnings:

  - A unique constraint covering the columns `[karyawanId,kriteriaId,createdAt]` on the table `Penilaian` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Penilaian_karyawanId_kriteriaId_key";

-- AlterTable
ALTER TABLE "Penilaian" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Penilaian_karyawanId_kriteriaId_createdAt_key" ON "Penilaian"("karyawanId", "kriteriaId", "createdAt");
