const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
console.log('FRONTEND_URL from .env:', process.env.FRONTEND_URL);
const cors = require("cors");

app.use(cors());
app.use(express.json());

// Import routes
const karyawanRoutes = require("./src/routes/karyawanRoutes");
const kriteriaRoutes = require("./src/routes/kriteriaRoutes");
const penilaianRoutes = require("./src/routes/penilaianRoutes");
const authRoutes = require("./src/routes/authRoutes");
const ahpRoutes = require("./src/routes/ahpRoutes");
const rankingRoutes = require("./src/routes/rankingRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const notifikasiRoutes = require("./src/routes/notifikasiRoutes");
const bobotRoutes = require("./src/routes/bobot");
// Use routes
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/ahp", ahpRoutes);
app.use("/api/karyawan", karyawanRoutes);
app.use("/api/kriteria", kriteriaRoutes);
app.use("/api/penilaian", penilaianRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bobot", bobotRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
