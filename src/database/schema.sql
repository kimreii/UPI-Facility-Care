-- ==============================================================
-- DATABASE SCHEMA: Campus Facility Maintenance & AI Vision
-- DBMS: Microsoft SQL Server
-- ==============================================================

-- 1. Buat Database (Uncomment jika belum ada)
-- CREATE DATABASE CampusFacilityDB;
-- USE CampusFacilityDB;

-- 2. Hapus tabel jika sudah ada sebelumnya (untuk reset bersih)
IF OBJECT_ID('dbo.Defects', 'U') IS NOT NULL DROP TABLE dbo.Defects;
IF OBJECT_ID('dbo.Tasks', 'U') IS NOT NULL DROP TABLE dbo.Tasks;
IF OBJECT_ID('dbo.Inspections', 'U') IS NOT NULL DROP TABLE dbo.Inspections;
IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL DROP TABLE dbo.Rooms;

-- ==============================================================
-- TABEL 1: Rooms (Master Data Ruangan & Fasilitas Kampus)
-- ==============================================================
CREATE TABLE Rooms (
    room_id INT IDENTITY(1,1) PRIMARY KEY,
    room_code VARCHAR(20) NOT NULL UNIQUE,     -- Contoh: 'LAB-KOMP-1', 'R-301'
    room_name VARCHAR(100) NOT NULL,            -- Contoh: 'Laboratorium Komputer 1'
    building VARCHAR(50) NOT NULL,              -- Contoh: 'Gedung Rektorat / Gedung Fasilkom'
    floor_number INT NOT NULL,                  -- Contoh: 3
    room_type VARCHAR(50) DEFAULT 'Classroom',  -- 'Classroom', 'Lab', 'Toilet', 'Hall'
    created_at DATETIME DEFAULT GETDATE()
);

-- ==============================================================
-- TABEL 2: Inspections (Riwayat Hasil Analisis AI per Ruangan)
-- ==============================================================
CREATE TABLE Inspections (
    inspection_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL FOREIGN KEY REFERENCES Rooms(room_id) ON DELETE CASCADE,
    inspection_date DATETIME DEFAULT GETDATE(),
    image_original_path VARCHAR(500) NULL,      -- Path file foto (opsional)
    image_annotated_path VARCHAR(500) NULL,     -- Path file anotasi (opsional)
    image_original_data VARBINARY(MAX) NULL,    -- Foto asli disimpan langsung sebagai BLOB / Binary di SQL
    image_annotated_data VARBINARY(MAX) NULL,   -- Foto hasil AI disimpan langsung sebagai BLOB / Binary di SQL
    cleanliness_percentage FLOAT NOT NULL,      -- Skor 0.0 - 100.0%
    total_defects INT NOT NULL,                 -- Jumlah kerusakan fisik terdeteksi
    total_trash INT NOT NULL,                   -- Jumlah sampah terdeteksi
    severity_level VARCHAR(20) NOT NULL,        -- 'Low', 'Medium', 'High'
    status VARCHAR(30) DEFAULT 'Pending Review',-- 'Pending Review', 'In Progress', 'Resolved'
    notes NVARCHAR(MAX) NULL
);

-- ==============================================================
-- TABEL 3: Defects (Detail Setiap Kerusakan / Sampah yang Ditemukan AI)
-- ==============================================================
CREATE TABLE Defects (
    defect_id INT IDENTITY(1,1) PRIMARY KEY,
    inspection_id INT NOT NULL FOREIGN KEY REFERENCES Inspections(inspection_id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL,              -- 'Damage' atau 'Cleanliness'
    class_name VARCHAR(50) NOT NULL,            -- 'crack', 'trash', 'stain', 'broken_chair'
    confidence FLOAT NOT NULL,                  -- Nilai keyakinan AI (misal 0.88 = 88%)
    bbox_x INT NOT NULL,                        -- Posisi X kotak
    bbox_y INT NOT NULL,                        -- Posisi Y kotak
    bbox_width INT NOT NULL,                    -- Lebar kotak
    bbox_height INT NOT NULL,                   -- Tinggi kotak
    area_percentage FLOAT NOT NULL              -- Luas kerusakan dibanding total foto (%)
);

-- ==============================================================
-- TABEL 4: Tasks (Work Order Pembersihan / Fasilitas Kampus)
-- ==============================================================
IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
CREATE TABLE Tasks (
    task_id VARCHAR(30) PRIMARY KEY,           -- Contoh: 'UFC-001'
    asset_code VARCHAR(30) NULL,               -- Contoh: 'AST-001'
    judul VARCHAR(200) NOT NULL,
    lokasi VARCHAR(100) NOT NULL,
    petugas VARCHAR(100) NOT NULL,
    prioritas VARCHAR(20) DEFAULT 'Normal',    -- 'Normal', 'Tinggi', 'Darurat'
    tenggat DATE NOT NULL,
    deskripsi NVARCHAR(MAX) NULL,
    status VARCHAR(30) DEFAULT 'Menunggu',      -- 'Menunggu', 'Diproses', 'Selesai'
    catatan NVARCHAR(MAX) NULL,
    foto_url VARCHAR(500) NULL,
    cleanliness_percentage FLOAT NULL,
    dirtiness_percentage FLOAT NULL,
    physical_condition_percentage FLOAT NULL,
    ai_status VARCHAR(100) NULL,
    inspection_id INT NULL FOREIGN KEY REFERENCES Inspections(inspection_id),
    created_at DATETIME DEFAULT GETDATE(),
    completed_at DATETIME NULL
);

-- ==============================================================
-- TABEL 5: DamageReports (Laporan Kerusakan dari Petugas ke Admin)
-- ==============================================================
IF OBJECT_ID('dbo.DamageReports', 'U') IS NULL
CREATE TABLE DamageReports (
    report_id VARCHAR(30) PRIMARY KEY,         -- Contoh: 'REP-001'
    judul VARCHAR(200) NOT NULL,               -- Contoh: 'Kebocoran Pipa Toilet Gedung A'
    lokasi VARCHAR(150) NOT NULL,              -- Contoh: 'Lt.1 - Gedung A'
    pelapor VARCHAR(100) DEFAULT 'Rian (Petugas)',
    urgensi VARCHAR(30) DEFAULT 'Mendesak',    -- 'Mendesak', 'Tinggi', 'Sedang'
    tanggal VARCHAR(30) NOT NULL,              -- Contoh: '01 Sep 2026'
    jam VARCHAR(20) NOT NULL,                  -- Contoh: '09:30'
    status VARCHAR(40) DEFAULT 'Dalam Peninjauan',
    kategori NVARCHAR(300) NULL,               -- Contoh: 'Butuh peninjauan segera, Kerusakan total'
    catatan NVARCHAR(MAX) NULL,
    foto_url NVARCHAR(MAX) NULL,               -- URL atau Base64 Foto Bukti Kerusakan
    created_at DATETIME DEFAULT GETDATE()
);

-- ==============================================================
-- DUMMY DATA UNTUK PENGUJIAN AWAL
-- ==============================================================
IF NOT EXISTS (SELECT 1 FROM Rooms)
BEGIN
    INSERT INTO Rooms (room_code, room_name, building, floor_number, room_type)
    VALUES 
        ('LAB-IOT-1', 'Lab IOT', 'Gedung Teknik', 2, 'Lab'),
        ('R-101', 'Ruang Kuliah Teori 101', 'Gedung Perkuliahan A', 1, 'Classroom'),
        ('R-204', 'Ruang Seminar 204', 'Gedung Perkuliahan B', 2, 'Classroom'),
        ('TL-01', 'Toilet Gedung A Lantai 2', 'Gedung Perkuliahan A', 2, 'Toilet')
END;

IF NOT EXISTS (SELECT 1 FROM Tasks)
BEGIN
    INSERT INTO Tasks (task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi, status)
    VALUES 
        ('WO-001', 'AST-001', 'Toilet Gedung A Lantai 2', 'Toilet Gedung A Lantai 2', 'Petugas 1', 'Normal', '2027-01-15', 'Membersihkan toilet, memeriksa persediaan sabun & tisu.', 'Menunggu'),
        ('WO-002', 'AST-002', 'Ruang Kuliah Teori 101', 'Gedung Perkuliahan A', 'Petugas 2', 'Normal', '2027-01-16', 'Menyapu dan mengepel ruang kelas setelah perkuliahan.', 'Diproses'),
        ('WO-003', 'AST-003', 'Perpustakaan Pusat Kampus', 'Gedung Perpustakaan', 'Petugas 1', 'Tinggi', '2027-01-17', 'Membersihkan lantai, jendela, dan merapikan area baca.', 'Selesai'),
        ('WO-004', 'AST-004', 'Lab IOT', 'Gedung Teknik Lt. 2', 'Petugas 3', 'Darurat', '2027-01-18', 'Inspeksi kebersihan ruangan server dan lab komputer.', 'Diproses')
END;
