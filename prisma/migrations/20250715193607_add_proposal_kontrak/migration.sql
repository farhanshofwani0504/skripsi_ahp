-- CreateEnum
CREATE TYPE "JenisProposal" AS ENUM ('PERPANJANGAN', 'PEMUTUSAN');

-- CreateEnum
CREATE TYPE "StatusProposal" AS ENUM ('PENDING', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "ProposalKontrak" (
    "id" SERIAL NOT NULL,
    "karyawanId" INTEGER NOT NULL,
    "jenis" "JenisProposal" NOT NULL,
    "alasan" TEXT NOT NULL,
    "tanggalPengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusProposal" NOT NULL DEFAULT 'PENDING',
    "tanggalKeputusan" TIMESTAMP(3),
    "catatanOwner" TEXT,
    "tanggalMulaiBaru" TIMESTAMP(3),
    "tanggalAkhirBaru" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalKontrak_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProposalKontrak" ADD CONSTRAINT "ProposalKontrak_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalKontrak" ADD CONSTRAINT "ProposalKontrak_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
