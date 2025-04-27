-- CreateTable
CREATE TABLE "BobotKriteria" (
    "id" SERIAL NOT NULL,
    "kriteriaId" INTEGER NOT NULL,
    "bobot" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BobotKriteria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BobotKriteria" ADD CONSTRAINT "BobotKriteria_kriteriaId_fkey" FOREIGN KEY ("kriteriaId") REFERENCES "Kriteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
