# Proyek Sistem Pendukung Keputusan Karyawan

Proyek ini adalah sistem pendukung keputusan (SPK) untuk penilaian karyawan menggunakan metode Analitycal Hierarchy Process (AHP).

## Instalasi

1.  Clone repositori ini:
    ```bash
    git clone <URL_repositori>
    ```
2.  Install dependensi:
    ```bash
    npm install
    ```
3.  Buat file `.env` dan konfigurasi variabel lingkungan yang diperlukan.

## Penggunaan

Untuk menjalankan aplikasi, gunakan perintah berikut:

```bash
npm start
```

## Skrip

-   `npm start`: Menjalankan aplikasi dengan `nodemon`.
-   `npm test`: Menjalankan tes dengan `jest`.
-   `npm run seed`: Menjalankan proses seeding database.

## Dependensi

-   [@faker-js/faker](https://www.npmjs.com/package/@faker-js/faker): Untuk menghasilkan data palsu.
-   [@prisma/client](https://www.npmjs.com/package/@prisma/client): Klien Prisma untuk berinteraksi dengan database.
-   [bcryptjs](https://www.npmjs.com/package/bcryptjs): Untuk hashing kata sandi.
-   [cors](https://www.npmjs.com/package/cors): Middleware untuk mengaktifkan Cross-Origin Resource Sharing.
-   [csv-parse](https://www.npmjs.com/package/csv-parse): Untuk mem-parsing data CSV.
-   [csv-parser](https://www.npmjs.com/package/csv-parser): Untuk mem-parsing data CSV.
-   [date-fns](https://www.npmjs.com/package/date-fns): Untuk manipulasi tanggal.
-   [dotenv](https://www.npmjs.com/package/dotenv): Untuk memuat variabel lingkungan dari file `.env`.
-   [express](https://www.npmjs.com/package/express): Kerangka kerja web untuk Node.js.
-   [fs-extra](https://www.npmjs.com/package/fs-extra): Untuk operasi sistem file.
-   [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken): Untuk membuat dan memverifikasi JSON Web Tokens.
-   [multer](https://www.npmjs.com/package/multer): Middleware untuk menangani `multipart/form-data`.
-   [nodemailer](https://www.npmjs.com/package/nodemailer): Untuk mengirim email.
-   [nodemon](https://www.npmjs.com/package/nodemon): Untuk me-restart server secara otomatis saat ada perubahan file.
-   [path](https://www.npmjs.com/package/path): Utilitas untuk menangani dan mengubah path file.
-   [pdfkit](https://www.npmjs.com/package/pdfkit): Untuk membuat dokumen PDF.
-   [pdfkit-table](https://www.npmjs.com/package/pdfkit-table): Untuk membuat tabel dalam dokumen PDF.
-   [pg](https://www.npmjs.com/package/pg): Driver PostgreSQL untuk Node.js.

## Dependensi Pengembangan

-   [jest](https://www.npmjs.com/package/jest): Kerangka kerja pengujian JavaScript.
-   [prisma](https://www.npmjs.com/package/prisma): Toolkit database untuk Node.js.

## Database

Proyek ini menggunakan Prisma sebagai ORM. Skema database didefinisikan di `prisma/schema.prisma`.

## API

Dokumentasi API dapat ditemukan di [Postman](https://documenter.getpostman.com/view/12345678/your-collection-id).

## Pengujian

Untuk menjalankan tes, gunakan perintah berikut:

```bash
npm test
```
