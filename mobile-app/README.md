# 📱 UPI Facility Care — Mobile App (Expo & React Native)

Aplikasi mobile berbasis **React Native** & **Expo SDK 53** untuk sistem pemeliharaan dan inspeksi kebersihan fasilitas kampus **Universitas Pendidikan Indonesia (UPI)** yang terintegrasi langsung dengan model AI Computer Vision (YOLOv8) dan database Microsoft SQL Server.

---

## 🌟 Fitur Utama Mobile App

### 1. ▦ Role Administrator
* **Dashboard Statistik Real-Time**: Memantau total work order, status pengerjaan (*Menunggu*, *Diproses*, *Selesai*), dan sinkronisasi dengan database backend.
* **Manajemen Work Order**: Membuat tugas baru dengan penetapan prioritas (*Normal*, *Tinggi*, *Darurat*), tenggat waktu, dan pilihan aset.
* **Katalog Aset & QR Code**: Daftar seluruh fasilitas kampus (`AST-001` hingga `AST-005`), lokasi, kondisi, dan tombol cepat pembuatan work order.
* **Kalender Maintenance**: Visualisasi jadwal pemeliharaan fasilitas harian.
* **Laporan Terverifikasi AI**: Melihat bukti foto teranotasi (*bounding box*) beserta skor kebersihan, kekotoran, dan kondisi fisik.

### 2. 🧹 Role Petugas Kebersihan
* **Daftar Tugas Petugas**: Filter tugas berdasarkan status (*Baru*, *Diproses*, *Selesai*) dan fitur pencarian nama atau lokasi.
* **Pemindai QR Code Real-Time**: Kamera langsung mendeteksi kode QR fasilitas untuk menampilkan info aset dan work order terkait.
* **Verifikasi AI Computer Vision**: Mengunggah foto bukti langsung ke server AI Python YOLOv8:
  - Skor Kebersihan (*Cleanliness %*)
  - Tingkat Kekotoran (*Dirtiness %*) & Kategori (*Sangat Bersih*, *Bersih*, *Kotor*, *Sangat Kotor*)
  - Integritas Fisik (*Physical Condition %*) & Tingkat Kerusakan (*Aman*, *Rusak Ringan*, *Rusak Berat*, *Rusak Banget $\le 15\%$*)
  - Jumlah sampah, noda cairan/darah/urin, jejak kaki, dan percikan air
  - Menampilkan foto hasil anotasi *bounding box* langsung di layar HP!
* **Pengiriman Laporan**: Menyimpan catatan dan hasil verifikasi AI langsung ke SQL Server (atau cache lokal jika offline).

### 3. 📷 Kamera AI Inspeksi Langsung
* Tampilan kamera full-screen dengan HUD *(Head-Up Display)* bergaya Computer Vision.
* Pemilihan ruangan/fasilitas yang diinspeksi.
* Snapshot instan dan analisis AI YOLOv8 dengan hasil evaluasi kelayakan fasilitas.

### 4. ⚙️ Pengaturan Server API Fleksibel (In-App)
* Tombol badge status koneksi server (*Online* / *Offline*) di setiap halaman.
* Modal konfigurasi Server URL dengan fitur **Uji Koneksi (Test Connection)** langsung dari HP.
* Pilihan preset otomatis:
  - Wi-Fi Laptop Host (`http://192.168.1.108:8000`)
  - Android Emulator (`http://10.0.2.2:8000`)
  - Web Localhost (`http://localhost:8000`)

---

## 🚀 Cara Menjalankan

### Langkah 1: Jalankan Server Backend Python (Di Laptop)
Buka terminal PowerShell di folder utama `d:\Tugas AI computer vision`:
```powershell
.\.venv\Scripts\Activate.ps1
python main.py --web
```
Server FastAPI akan aktif dan menampilkan alamat IP lokal laptop (misal: `http://192.168.1.108:8000`).
> *Pastikan Laptop dan HP terhubung ke jaringan Wi-Fi atau Hotspot yang sama.*

---

### Langkah 2: Jalankan Aplikasi Mobile (Expo)
Buka terminal baru di folder `mobile-app`:
```powershell
cd "d:\Tugas AI computer vision\mobile-app"
npx expo start
```

### Langkah 3: Buka di HP Anda
* **Android**: Buka aplikasi **Expo Go** di HP, lalu scan QR Code yang muncul di terminal.
* **iOS**: Buka aplikasi Kamera bawaan iPhone, scan QR Code, dan buka lewat **Expo Go**.
* **Browser (Web Testing)**: Tekan tombol **`w`** di terminal untuk membuka di peramban komputer.
