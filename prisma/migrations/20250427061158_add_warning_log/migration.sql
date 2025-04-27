-- CreateTable
CREATE TABLE "WarningLog" (
    "id" SERIAL NOT NULL,
    "karyawanId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarningLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WarningLog" ADD CONSTRAINT "WarningLog_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
