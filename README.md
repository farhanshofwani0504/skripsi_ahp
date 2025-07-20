# Sistem Pendukung Keputusan Penilaian Kinerja Karyawan (AHP)

## Deskripsi

Proyek ini adalah sistem pendukung keputusan (SPK) berbasis web yang dirancang untuk membantu dalam proses penilaian kinerja karyawan menggunakan metode *Analytical Hierarchy Process* (AHP). Sistem ini memungkinkan manajemen untuk melakukan penilaian yang lebih objektif dan terstruktur, menghasilkan peringkat karyawan berdasarkan kriteria yang telah ditentukan.

## Fitur Utama

- **Manajemen Pengguna:** Sistem memiliki peran pengguna (Admin dan Owner) dengan hak akses yang berbeda.
- **Manajemen Karyawan:** CRUD (Create, Read, Update, Delete) untuk data karyawan.
- **Manajemen Kriteria & Bobot:** Memungkinkan admin untuk menambah, mengubah, dan menghapus kriteria penilaian serta bobotnya.
- **Proses Penilaian:** Memfasilitasi proses memasukkan nilai kinerja untuk setiap karyawan berdasarkan kriteria yang ada.
- **Perhitungan AHP:** Secara otomatis menghitung bobot prioritas kriteria dan skor akhir karyawan menggunakan metode AHP.
- **Perankingan:** Menampilkan hasil perankingan karyawan secara keseluruhan.
- **Notifikasi Email:** Mengirimkan notifikasi melalui email untuk berbagai keperluan, seperti surat peringatan atau pemecatan.
- **Laporan:** Menghasilkan laporan dalam format PDF dan Excel.
- **Manajemen Proposal:** Alur persetujuan proposal untuk perpanjangan kontrak atau tindakan lainnya terkait karyawan.

## Alur Kerja Aplikasi

1.  **Inisialisasi Data:**
    *   Admin melakukan *seeding* data awal yang diperlukan, seperti data kriteria, bobot, dan pengguna awal melalui `prisma/seed.js`.

2.  **Manajemen Karyawan & Kriteria:**
    *   Admin dapat menambahkan, mengubah, atau menghapus data karyawan.
    *   Admin mendefinisikan kriteria yang akan digunakan untuk penilaian dan memberikan bobot perbandingan berpasangan untuk setiap kriteria.

3.  **Proses Penilaian:**
    *   Admin memasukkan data penilaian untuk setiap karyawan berdasarkan kriteria yang telah ditetapkan.

4.  **Perhitungan & Perankingan:**
    *   Sistem akan memproses data penilaian menggunakan metode AHP untuk menghitung skor akhir setiap karyawan.
    *   Hasil perhitungan akan digunakan untuk membuat perankingan karyawan.

5.  **Pengambilan Keputusan:**
    *   Berdasarkan hasil perankingan dan data lainnya, Admin dapat membuat proposal (misalnya untuk perpanjangan kontrak atau pemecatan).
    *   Proposal tersebut kemudian dapat disetujui atau ditolak oleh *Owner*.

6.  **Notifikasi:**
    *   Sistem dapat mengirimkan notifikasi email kepada karyawan terkait hasil penilaian atau keputusan lainnya.

## Teknologi yang Digunakan

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens), bcryptjs
- **Testing:** Jest
- **Lainnya:** Nodemailer (untuk email), PDFKit (untuk generate PDF), dan lain-lain.

## Instalasi & Setup

1.  **Clone repository:**
    ```bash
    git clone <URL_REPOSITORY_ANDA>
    cd <NAMA_DIREKTORI>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup database:**
    *   Pastikan Anda memiliki PostgreSQL yang berjalan.
    *   Buat file `.env` di root proyek dan konfigurasikan `DATABASE_URL`. Contoh:
        ```
        DATABASE_URL="postgresql://user:password@localhost:5432/database_name?schema=public"
        ```
    *   Jalankan migrasi Prisma untuk membuat skema database:
        ```bash
        npx prisma migrate dev --name init
        ```

4.  **Seed data awal (opsional tapi direkomendasikan):**
    ```bash
    npx prisma db seed
    ```
    *Script* ini akan menjalankan `prisma/seed.js` untuk mengisi data awal yang dibutuhkan.

5.  **Jalankan aplikasi:**
    ```bash
    npm start
    ```
    Server akan berjalan di `http://localhost:3000` (atau port yang Anda tentukan di `.env`).

## Struktur Proyek

```
.
├── prisma/             # Skema, migrasi, dan seed data Prisma
├── src/
│   ├── controllers/    # Logika bisnis untuk setiap endpoint
│   ├── middleware/     # Middleware untuk otentikasi dan otorisasi
│   ├── routes/         # Definisi endpoint API
│   ├── services/       # Logika servis (email, report, dll.)
│   └── utils/          # Fungsi utilitas (perhitungan AHP, skor, dll.)
├── __tests__/          # File untuk unit & integration testing
├── app.js              # Entry point aplikasi Express
├── package.json        # Dependensi dan skrip proyek
└── README.md           # Dokumentasi ini
```

## API Endpoints

Berikut adalah ringkasan dari endpoint API utama yang tersedia:

- `POST /api/auth/login`: Login pengguna.
- `POST /api/auth/forgot-password`: Mengirim email untuk reset password.
- `POST /api/auth/reset-password/:token`: Mereset password dengan token.

- `GET /api/karyawan`: Mendapatkan semua data karyawan.
- `POST /api/karyawan`: Menambah karyawan baru.
- `GET /api/karyawan/:id`: Mendapatkan detail karyawan.
- `PATCH /api/karyawan/:id`: Memperbarui data karyawan.
- `DELETE /api/karyawan/:id`: Menghapus karyawan.
- `POST /api/karyawan/import-csv-karyawan`: Import data karyawan dari CSV.

- `GET /api/kriteria`: Mendapatkan semua kriteria.
- `POST /api/kriteria`: Menambah kriteria baru.

- `GET /api/penilaian`: Mendapatkan data penilaian.
- `POST /api/penilaian`: Menambah atau memperbarui data penilaian.

- `POST /api/ahp/calculate`: Memulai perhitungan AHP.
- `GET /api/ranking`: Mendapatkan hasil perankingan.

- `GET /api/dashboard/kesimpulan`: Mendapatkan ringkasan data untuk dashboard.

- `POST /api/notifikasi/kirim-peringatan`: Mengirim email peringatan massal.

- `POST /api/proposal`: Membuat proposal baru.
- `GET /api/proposal`: Melihat daftar proposal.
- `PATCH /api/proposal/:id/keputusan`: Menyetujui atau menolak proposal.

---