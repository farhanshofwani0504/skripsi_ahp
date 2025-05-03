// --------------------  ESM  --------------------
import { PrismaClient } from "@prisma/client";
import { calcRollingAvg, toGrade } from "../utils/score.js";

const prisma = new PrismaClient();

/* ---------- GET /api/karyawan ---------- */
export const getAllKaryawan = async (_req, res, next) => {
  try {
    const list = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });

    const data = await Promise.all(
      list.map(async (k) => {
        const avg3m = await calcRollingAvg(prisma, k.id);
        return { ...k, rollingAvg: avg3m, grade: toGrade(avg3m) };
      })
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getKaryawanById = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });

  try {
    const k = await prisma.karyawan.findUnique({ where: { id } });
    if (!k)
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });

    const avg3m = await calcRollingAvg(prisma, id);
    res.json({ ...k, rollingAvg: avg3m, grade: toGrade(avg3m) });
  } catch (err) {
    next(err);
  }
};

/* ---------- POST /api/karyawan ---------- */
export const addKaryawan = async (req, res, next) => {
  const { nama, posisi, email } = req.body;
  if (!nama || !posisi)
    return res.status(400).json({ message: "nama & posisi wajib diisi" });

  try {
    const newKaryawan = await prisma.karyawan.create({
      data: { nama, posisi, email: email || null },
    });
    res.status(201).json(newKaryawan);
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("email"))
      return res.status(409).json({ message: "email sudah dipakai" });
    next(err);
  }
};

/* ---------- DELETE /api/karyawan/:id ---------- */
export const deleteKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });

  try {
    await prisma.karyawan.delete({ where: { id } }); // FK sudah cascade
    res.json({ message: `karyawan #${id} terhapus ✅` });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "karyawan tidak ditemukan" });
    next(err);
  }
};

/* ---------- PATCH /api/karyawan/:id ---------- */
export const updateKaryawan = async (req, res, next) => {
  const id = Number(req.params.id);
  const { nama, posisi, email } = req.body;

  if (Number.isNaN(id)) return res.status(400).json({ message: "ID invalid" });
  if (!nama && !posisi && !email)
    return res.status(400).json({ message: "Tidak ada field di‑update" });

  try {
    const updated = await prisma.karyawan.update({
      where: { id },
      data: {
        ...(nama && { nama }),
        ...(posisi && { posisi }),
        ...(email && { email }),
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("email"))
      return res.status(409).json({ message: "Email sudah dipakai" });
    if (err.code === "P2025")
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    next(err);
  }
};
