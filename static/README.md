# UPI Facility Care

Prototype aplikasi pengelolaan kebersihan dan pemeliharaan fasilitas kampus menggunakan HTML, CSS, dan JavaScript.

## Isi folder
- `index.html` — halaman awal untuk memilih peran.
- `admin.html` — dashboard administrator untuk membuat dan memantau tugas.
- `petugas.html` — layar terpisah untuk tugas, pemindai QR aset, dan laporan petugas.
- `style.css` — desain mobile-first dengan lebar seperti aplikasi HP, termasuk saat dipreview dari browser desktop.
- `app.js` — navigasi layar, work order, laporan, daftar aset demo, dan pemindai QR melalui kamera browser.

## Cara menjalankan di VS Code
1. Ekstrak ZIP.
2. Buka folder `upi-facility-care` di VS Code.
3. Pasang ekstensi **Live Server** jika belum tersedia.
4. Klik kanan `index.html` lalu pilih **Open with Live Server**.
5. Pilih Administrator atau Petugas Kebersihan.

## Catatan penting
- Ini masih prototype frontend. Data disimpan pada `localStorage` di browser yang sama.
- Admin dan petugas bisa menguji data pada browser/origin yang sama; data tidak otomatis tersinkron ke perangkat lain.
- Pilihan peran bukan sistem login yang aman.
- Foto dibatasi 1 MB agar lebih mungkin muat dalam penyimpanan browser.
- Untuk penggunaan nyata, tambahkan backend/API, database bersama, autentikasi, dan penyimpanan foto server.


## Tampilan mobile terbaru
Aplikasi menggunakan lebar mobile (maksimal 430px) dan navigasi bawah yang mengikuti referensi desain Admin dan Petugas. Saat dibuka dari laptop, halaman ditampilkan sebagai preview aplikasi HP di tengah layar. Navigasi bawah berpindah layar tanpa menggabungkan semua konten dalam satu halaman panjang. Tab QR meminta izin kamera dan mencoba membaca QR melalui BarcodeDetector pada browser yang mendukungnya. Untuk kamera, jalankan melalui localhost/Live Server atau HTTPS. Data kode aset saat ini masih contoh yang disimpan di localStorage; agar bisa dipakai bersama admin dan petugas di perangkat berbeda, perlu backend dan database server (misalnya MySQL/PostgreSQL/Firebase) serta pendaftaran kode QR aset yang nyata.
