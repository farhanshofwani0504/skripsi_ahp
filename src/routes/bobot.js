// routes/bobot.js
const router = require("express").Router();
const ctrl = require("../controllers/bobotController");

router.post("/", ctrl.upsertBobot); // add / update bobot
router.get("/", ctrl.getAllBobot); // list

module.exports = router;
