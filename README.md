# 🏢 Campus Facility AI Vision & Inspection System

Sistem Computer Vision berbasis AI (YOLOv8) dan Microsoft SQL Server untuk inspeksi fasilitas kampus: deteksi kerusakan fisik, penilaian seberapa kotor tempat (*dirtiness score*), persentase kelayakan/kebersihan (*cleanliness score*), serta penentuan status selesai atau belum selesai.

---

## 📁 Struktur Project

```text
d:/Tugas AI computer vision/
├── main.py                  # Entrypoint Utama: Langsung Buka Kamera & Deteksi AI
├── run_camera.py            # Script Kamera Desktop OpenCV Langsung
├── test_pipeline.py         # Script Uji Coba Logika AI & Formula Penilaian
├── models/
│   └── yolov8n.pt           # Bobot Model AI YOLO
├── uploads/                 # Foto asli dan hasil anotasi AI
├── static/
│   └── index.html           # Tampilan Kamera Web Sederhana (Hanya Kamera & HUD AI)
├── src/
│   ├── api/
│   │   └── main.py          # REST API Backend (FastAPI)
│   ├── core/
│   │   └── analyzer.py      # Engine AI Computer Vision, Deteksi Sampah/Noda & Formula
│   └── database/
│       ├── db_manager.py    # Modul Koneksi ke Microsoft SQL Server
│       └── schema.sql       # Script DDL Pembuatan Tabel SQL Server
├── mobile-app/              # Aplikasi Mobile React Native & Expo (Admin, Petugas, QR & AI)
├── requirements.txt         # Daftar Dependency Python
├── .env                     # Konfigurasi SQL Server & Port
└── README.md                # Dokumentasi Lengkap
```

---

## 🚀 Cara Menjalankan

### 1. Masuk ke Virtual Environment
Buka terminal PowerShell di folder project:
```powershell
.\.venv\Scripts\Activate.ps1
```

### 2. Buka Kamera & Pendeteksi Analisis Langsung (Rekomendasi Utama)
Cukup jalankan satu perintah berikut:
```powershell
python main.py
```
*(atau bisa juga menjalankan `python run_camera.py`)*

Jendela kamera OpenCV akan langsung terbuka dengan deteksi dan analisis real-time:
* **Banner Status Atas:**
  - Status: **`[SELESAI]`** (Hijau) jika skor $> 50\%$
  - Status: **`[BELUM SELESAI - BELUM BERSIH / RUSAK]`** (Merah) jika skor $0\% - 50\%$
  - Skor Kebersihan / Kelayakan (%)
  - Penilaian Seberapa Kotor Tempat (%) dan Kategorinya
  - Jumlah sampah dan kerusakan terdeteksi
* **Kontrol Keyboard:**
  - **`[M]`** : Toggle Mirror (Balik tampilan kamera horizontal secara instan)
  - **`[SPASI]`** : Ambil foto snapshot & simpan hasil analisis ke database SQL Server
  - **`[Q / ESC]`** : Tutup kamera dan keluar

---

### 3. Menguji Coba Logika AI (Uji Coba Cepat Tanpa Kamera)
Jika ingin menguji coba logika dan formula penilaian tanpa webcam fisik:
```powershell
python test_pipeline.py
```

---

### 4. Mode Kamera Web (Opsional)
Jika ingin menjalankan lewat peramban web (browser):
```powershell
python main.py --web
```
Buka browser ke `http://127.0.0.1:8000`. Tampilan web ini telah disederhanakan murni hanya menampilkan:
* Viewport live webcam
* Kotak deteksi bounding box langsung di atas video
* HUD status penyelesaian (`SELESAI` vs `BELUM SELESAI`)
* Penilaian seberapa kotor tempat

---

### 5. Menjalankan Aplikasi Mobile (React Native / Expo)
Aplikasi mobile untuk **Administrator** dan **Petugas Kebersihan** (scan QR aset & foto verifikasi AI langsung dari HP):

1. Pastikan server web API berjalan di laptop:
```powershell
python main.py --web
```
2. Buka terminal baru dan masuk ke folder `mobile-app`:
```powershell
cd mobile-app
npx expo start
```
3. Scan QR Code menggunakan aplikasi **Expo Go** di HP Android atau kamera iPhone.
4. Di dalam aplikasi HP, atur alamat server ke IP laptop (misal: `http://192.168.1.108:8000`) melalui ikon gerigi / badge server di pojok atas.

---

## 🧠 Aturan Penilaian AI (*Scoring Logic*)

Sesuai spesifikasi kebutuhan:

### 1. Penilaian Seberapa Kotor Tempat Itu (*Dirtiness Score*)
Tingkat kekotoran dihitung dalam rentang **0.0% – 100.0%** berdasarkan akumulasi sampah, **noda darah/cairan pekat**, **noda urin/pipis**, **jejak kaki kotor (toilet/lantai)**, dan **percikan/genangan air**:
* **0% – 15%** : **Sangat Bersih** (Tidak ada sampah/noda yang berarti)
* **16% – 35%** : **Bersih / Rapi** (Tingkat kotor minimal, fasilitas sangat terawat)
* **36% – 50%** : **Cukup Bersih / Sedikit Kotor** (Terdapat sedikit sampah/noda, di ambang batas)
* **51% – 75%** : **Kotor** (Banyak sampah/noda/jejak cairan, perlu dibersihkan)
* **76% – 100%** : **Sangat Kotor** (Sampah menumpuk parah / noda dan cairan kotor berantakan)

### 2. Kondisi Fisik Fasilitas & Tingkatan Kerusakan (*Physical Condition*)
Penilaian integritas fisik fasilitas dihitung dalam rentang **0.0% – 100.0%** berdasarkan retakan lantai/dinding, lubang, dan kerusakan furnitur:
* **0% – 15%** : **Rusak Banget (Sangat Parah / Berbahaya)** (Kondisi kritis, struktur retak/pecah berbahaya, fasilitas tidak layak dipakai)
* **16% – 35%** : **Rusak Berat** (Banyak titik retak atau kerusakan fisik luas)
* **36% – 60%** : **Rusak Sedang** (Beberapa retakan atau kerusakan komponen yang memerlukan perbaikan)
* **61% – 85%** : **Rusak Ringan** (Cukup aman, hanya terdapat cacat minor atau goresan)
* **86% – 100%** : **Aman / Sangat Baik** (Fasilitas utuh, kokoh, dan sangat aman digunakan)

### 3. Skor Kebersihan & Kelayakan (*Cleanliness Score*)
$$\text{Skor} = \max\Big(0, (100\% - \text{Tingkat Kekotoran}) - ((100\% - \text{Kondisi Fisik}) \times 0.5)\Big)$$
* Jika kondisi fisik **Rusak Banget ($\le 15\%$)**, skor kelayakan dibatasi maksimal $40\%$, sehingga otomatis masuk ke status **`BELUM SELESAI`**.

### 4. Aturan Status Penyelesaian
* **Skor $> 50\%$ & Kondisi Fisik $> 15\%$** $\rightarrow$ **`SELESAI`** (Hijau)
  * Ruangan dinilai bersih, rapi, fasilitas terawat, dan layak serta aman digunakan.
* **Skor $0\% – 50\%$ atau Kondisi Fisik $\le 15\%$** $\rightarrow$ **`BELUM SELESAI`** (Merah)
  * Belum bersih, kotor, rusak, atau belum selesai ditangani.

> [!NOTE]
> Deteksi objek manusia (*person*) telah dinonaktifkan sepenuhnya dari sistem sesuai spesifikasi agar tidak mengganggu penilaian fasilitas.
