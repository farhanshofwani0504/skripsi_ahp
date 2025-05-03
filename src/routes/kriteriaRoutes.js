const express = require("express");
const router = express.Router();
const kriteriaController = require("../controllers/kriteriaController");

// GET semua kriteria
router.get("/", kriteriaController.getAllKriteria);

// POST tambah kriteria
router.post("/", kriteriaController.addKriteria);

// DELETE hapus kriteria
router.delete("/:id", kriteriaController.deleteKriteria);

router.post("/recalculate", kriteriaController.recalculate);

module.exports = router;
