import os
from typing import List, Dict, Any, Optional
import pyodbc
from dotenv import load_dotenv

load_dotenv()

class DatabaseManager:
    """
    Manages connections and transactions with Microsoft SQL Server.
    Provides methods to save and retrieve campus facility inspections.
    """

    def __init__(self):
        self.server = os.getenv("DB_SERVER", "localhost")
        self.database = os.getenv("DB_DATABASE", "CampusFacilityDB")
        self.username = os.getenv("DB_USER", "sa")
        self.password = os.getenv("DB_PASSWORD", "YourStrongPasswordHere!")
        self.driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
        self.trusted_connection = os.getenv("DB_TRUSTED_CONNECTION", "yes").lower() in ("yes", "true", "1")

    def _get_driver_str(self) -> str:
        d = self.driver.strip()
        return d if d.startswith("{") and d.endswith("}") else f"{{{d}}}"

    def get_connection(self, database: Optional[str] = None, autocommit: bool = False):
        """Membuka koneksi ke Microsoft SQL Server menggunakan pyodbc"""
        db = database if database is not None else self.database
        driver_str = self._get_driver_str()

        if self.trusted_connection:
            conn_str = (
                f"DRIVER={driver_str};"
                f"SERVER={self.server};"
                f"DATABASE={db};"
                "Trusted_Connection=yes;"
                "TrustServerCertificate=yes;"
            )
        else:
            conn_str = (
                f"DRIVER={driver_str};"
                f"SERVER={self.server};"
                f"DATABASE={db};"
                f"UID={self.username};"
                f"PWD={self.password};"
                "TrustServerCertificate=yes;"
            )
        return pyodbc.connect(conn_str, autocommit=autocommit)

    def init_database(self, schema_path: str = "src/database/schema.sql") -> Dict[str, Any]:
        """
        Membuat database jika belum ada, dan mengeksekusi tabel dari schema.sql secara otomatis.
        """
        # 1. Pastikan Database Terbuat di SQL Server
        with self.get_connection(database="master", autocommit=True) as master_conn:
            cursor = master_conn.cursor()
            cursor.execute(f"""
                IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{self.database}')
                BEGIN
                    CREATE DATABASE [{self.database}];
                END
            """)

        # 2. Eksekusi Script Skema Tabel
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found at: {schema_path}")

        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        with self.get_connection(database=self.database, autocommit=True) as db_conn:
            cursor = db_conn.cursor()
            # Pisahkan pernyataan berdasarkan titik koma jika diperlukan, atau eksekusi blok skrip
            statements = [s.strip() for s in sql_script.split(";") if s.strip()]
            for stmt in statements:
                # Abaikan baris komentar saja
                cleaned = "\n".join(line for line in stmt.splitlines() if not line.strip().startswith("--")).strip()
                if cleaned:
                    cursor.execute(cleaned)

        return {"status": "success", "message": f"Database {self.database} & skema tabel berhasil diinisialisasi."}

    def test_connection(self) -> Dict[str, Any]:
        """Uji apakah server MSSQL dapat dijangkau dan siap"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT @@VERSION AS version;")
                row = cursor.fetchone()
                return {"status": "success", "version": row[0] if row else "Unknown"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_rooms(self) -> List[Dict[str, Any]]:
        """Mengambil daftar seluruh ruangan fasilitas kampus"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT room_id, room_code, room_name, building, floor_number, room_type, status 
                FROM Rooms
                ORDER BY room_code
            """)
            rows = cursor.fetchall()
            return [
                {
                    "room_id": row.room_id,
                    "room_code": row.room_code,
                    "room_name": row.room_name,
                    "building": row.building,
                    "floor_number": row.floor_number,
                    "room_type": row.room_type,
                    "status": row.status or "Aktif",
                }
                for row in rows
            ]

    def add_room(self, room: Dict[str, Any]) -> int:
        """Menambahkan ruangan/aset baru ke dalam tabel Rooms SQL Server"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                IF EXISTS (SELECT 1 FROM Rooms WHERE room_code = ?)
                BEGIN
                    UPDATE Rooms
                    SET room_name = ?, building = ?, floor_number = ?, room_type = ?, status = ?
                    OUTPUT INSERTED.room_id
                    WHERE room_code = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO Rooms (room_code, room_name, building, floor_number, room_type, status)
                    OUTPUT INSERTED.room_id
                    VALUES (?, ?, ?, ?, ?, ?);
                END
            """, (
                room["room_code"],
                room["room_name"],
                room.get("building", "Gedung A"),
                room.get("floor_number", 1),
                room.get("room_type", "Umum"),
                room.get("status", "Aktif"),
                room["room_code"],
                room["room_code"],
                room["room_name"],
                room.get("building", "Gedung A"),
                room.get("floor_number", 1),
                room.get("room_type", "Umum"),
                room.get("status", "Aktif"),
            ))
            room_id = cursor.fetchone()[0]
            conn.commit()
            return room_id

    def update_room_status(self, room_code: str, status: str) -> bool:
        """Mengubah status ruangan (Aktif/Tutup) di Microsoft SQL Server"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE Rooms
                SET status = ?
                WHERE room_code = ?
            """, (status, room_code))
            updated = cursor.rowcount > 0
            conn.commit()
            return updated


    def save_inspection(
        self,
        room_id: int,
        cleanliness_percentage: float,
        total_defects: int,
        total_trash: int,
        severity_level: str,
        detections: List[Dict[str, Any]],
        image_original_path: Optional[str] = None,
        image_annotated_path: Optional[str] = None,
        image_original_bytes: Optional[bytes] = None,
        image_annotated_bytes: Optional[bytes] = None,
        notes: Optional[str] = None
    ) -> int:
        """
        Menyimpan hasil inspeksi AI dan detail kerusakan ke Microsoft SQL Server.
        Foto dapat disimpan langsung sebagai binary (BLOB VARBINARY) di database,
        tanpa harus bergantung pada file di direktori lokal.
        Mengembalikan inspection_id yang baru dibuat.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            orig_binary = pyodbc.Binary(image_original_bytes) if image_original_bytes else None
            annot_binary = pyodbc.Binary(image_annotated_bytes) if image_annotated_bytes else None

            # 1. Simpan Header Inspeksi
            insert_inspection_query = """
                INSERT INTO Inspections (
                    room_id, image_original_path, image_annotated_path,
                    image_original_data, image_annotated_data,
                    cleanliness_percentage, total_defects, total_trash,
                    severity_level, status, notes
                )
                OUTPUT INSERTED.inspection_id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', ?);
            """
            cursor.execute(
                insert_inspection_query,
                (
                    room_id,
                    image_original_path,
                    image_annotated_path,
                    orig_binary,
                    annot_binary,
                    cleanliness_percentage,
                    total_defects,
                    total_trash,
                    severity_level,
                    notes
                )
            )
            inspection_id = cursor.fetchone()[0]

            # 2. Simpan Setiap Detail Kerusakan/Sampah
            insert_detail_query = """
                INSERT INTO Defects (
                    inspection_id, category, class_name, confidence,
                    bbox_x, bbox_y, bbox_width, bbox_height, area_percentage
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """
            for item in detections:
                bbox = item["bbox"]
                cursor.execute(
                    insert_detail_query,
                    (
                        inspection_id,
                        item["category"],
                        item["class_name"],
                        item["confidence"],
                        bbox["x"],
                        bbox["y"],
                        bbox["width"],
                        bbox["height"],
                        item["area_percentage"]
                    )
                )

            # 3. Otomatis hapus data binary foto yang sudah lewat dari 3 bulan (90 hari)
            #    agar kapasitas database SQL Server tetap hemat tanpa menghapus riwayat teks/skor.
            cursor.execute("""
                UPDATE Inspections
                SET image_original_data = NULL,
                    image_annotated_data = NULL
                WHERE inspection_date < DATEADD(DAY, -90, GETDATE())
                  AND (image_original_data IS NOT NULL OR image_annotated_data IS NOT NULL);
            """)

            conn.commit()
            return inspection_id

    def cleanup_old_photos(self, retention_days: int = 90) -> int:
        """
        Menghapus khusus data binary foto (VARBINARY) yang usianya lebih dari `retention_days` (default 90 hari / 3 bulan),
        tetapi TETAP menyimpan data riwayat teks, skor kebersihan, dan tanggal di tabel Inspections & DamageReports.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE Inspections
                SET image_original_data = NULL,
                    image_annotated_data = NULL
                WHERE inspection_date < DATEADD(DAY, -?, GETDATE())
                  AND (image_original_data IS NOT NULL OR image_annotated_data IS NOT NULL);
            """, (retention_days,))
            cleaned_inspections = cursor.rowcount

            if cursor.tables(table='DamageReports', tableType='TABLE').fetchone():
                cursor.execute("""
                    UPDATE DamageReports
                    SET foto_url = NULL
                    WHERE created_at < DATEADD(DAY, -?, GETDATE())
                      AND foto_url LIKE 'data:image/%';
                """, (retention_days,))
                cleaned_inspections += max(0, cursor.rowcount)

            conn.commit()
            return max(0, cleaned_inspections)

    def get_inspection_image(self, inspection_id: int, image_type: str = "annotated") -> Optional[bytes]:
        """Mengambil data binary foto (BLOB) langsung dari tabel Inspections di Microsoft SQL Server"""
        column = "image_annotated_data" if image_type == "annotated" else "image_original_data"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT {column} FROM Inspections WHERE inspection_id = ?", (inspection_id,))
            row = cursor.fetchone()
            if row and row[0]:
                return bytes(row[0])
            return None

    def get_recent_inspections(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Mengambil data riwayat inspeksi terakhir beserta info ruangan"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = f"""
                SELECT TOP {limit} 
                    i.inspection_id, i.inspection_date, i.image_original_path, i.image_annotated_path,
                    i.cleanliness_percentage, i.total_defects, i.total_trash, i.severity_level,
                    i.status, i.notes,
                    r.room_code, r.room_name, r.building, r.floor_number
                FROM Inspections i
                JOIN Rooms r ON i.room_id = r.room_id
                ORDER BY i.inspection_date DESC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [
                {
                    "inspection_id": row.inspection_id,
                    "inspection_date": str(row.inspection_date),
                    "room_code": row.room_code,
                    "room_name": row.room_name,
                    "building": row.building,
                    "floor_number": row.floor_number,
                    "image_original_path": row.image_original_path,
                    "image_annotated_path": row.image_annotated_path,
                    "cleanliness_percentage": row.cleanliness_percentage,
                    "total_defects": row.total_defects,
                    "total_trash": row.total_trash,
                    "severity_level": row.severity_level,
                    "status": row.status,
                    "notes": row.notes,
                    "image_url": f"/api/inspections/{row.inspection_id}/image/annotated"
                }
                for row in rows
            ]

    def get_tasks(self) -> List[Dict[str, Any]]:
        """Mengambil seluruh data Work Order (Tugas) dari database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = """
                SELECT 
                    task_id, asset_code, judul, lokasi, petugas, prioritas,
                    CONVERT(VARCHAR(10), tenggat, 120) as tenggat,
                    deskripsi, status, catatan, foto_url,
                    cleanliness_percentage, dirtiness_percentage, physical_condition_percentage,
                    ai_status, inspection_id, completed_at
                FROM Tasks
                ORDER BY task_id ASC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [
                {
                    "id": row.task_id,
                    "assetCode": row.asset_code,
                    "judul": row.judul,
                    "lokasi": row.lokasi,
                    "petugas": row.petugas,
                    "prioritas": row.prioritas,
                    "tenggat": row.tenggat,
                    "deskripsi": row.deskripsi,
                    "status": row.status,
                    "catatan": row.catatan or "",
                    "foto": row.foto_url or "",
                    "cleanlinessPercentage": row.cleanliness_percentage,
                    "dirtinessPercentage": row.dirtiness_percentage,
                    "physicalConditionPercentage": row.physical_condition_percentage,
                    "aiStatus": row.ai_status or "",
                    "inspectionId": row.inspection_id
                }
                for row in rows
            ]

    def create_task(self, task: Dict[str, Any]) -> str:
        """Menyimpan tugas baru ke dalam database SQL Server (Upsert + Commit)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = """
                IF EXISTS (SELECT 1 FROM Tasks WHERE task_id = ?)
                BEGIN
                    UPDATE Tasks
                    SET asset_code = ?, judul = ?, lokasi = ?, petugas = ?, prioritas = ?, tenggat = ?, deskripsi = ?, status = ?
                    WHERE task_id = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO Tasks (task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                END
            """
            tenggat_val = task.get("tenggat") or "2026-10-10"
            if len(str(tenggat_val)) < 8 or "-" not in str(tenggat_val):
                tenggat_val = "2026-10-10"
            cursor.execute(
                query,
                (
                    task["id"],
                    task.get("assetCode"),
                    task["judul"],
                    task["lokasi"],
                    task["petugas"],
                    task.get("prioritas", "Normal"),
                    tenggat_val,
                    task.get("deskripsi", ""),
                    task.get("status", "Menunggu"),
                    task["id"],
                    task["id"],
                    task.get("assetCode"),
                    task["judul"],
                    task["lokasi"],
                    task["petugas"],
                    task.get("prioritas", "Normal"),
                    tenggat_val,
                    task.get("deskripsi", ""),
                    task.get("status", "Menunggu")
                )
            )
            conn.commit()
            return task["id"]

    def update_task_completion(self, task_id: str, data: Dict[str, Any]) -> bool:
        """Menyimpan hasil laporan/inspeksi petugas ke dalam tabel Tasks (Upsert + Commit)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                IF EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'Tasks' AND COLUMN_NAME = 'foto_url' AND CHARACTER_MAXIMUM_LENGTH = 500
                )
                BEGIN
                    ALTER TABLE Tasks ALTER COLUMN foto_url NVARCHAR(MAX) NULL;
                END
            """)
            query = """
                IF EXISTS (SELECT 1 FROM Tasks WHERE task_id = ?)
                BEGIN
                    UPDATE Tasks
                    SET 
                        status = ?,
                        catatan = ?,
                        foto_url = ?,
                        cleanliness_percentage = ?,
                        dirtiness_percentage = ?,
                        physical_condition_percentage = ?,
                        ai_status = ?,
                        inspection_id = ?,
                        completed_at = GETDATE()
                    WHERE task_id = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO Tasks (
                        task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi,
                        status, catatan, foto_url, cleanliness_percentage, dirtiness_percentage,
                        physical_condition_percentage, ai_status, inspection_id, completed_at
                    )
                    VALUES (
                        ?, 'AST-001', ?, 'Gedung Kampus', 'Petugas', 'Normal', CONVERT(DATE, GETDATE()),
                        'Tugas pemeliharaan fasilitas',
                        ?, ?, ?, ?, ?, ?, ?, ?, GETDATE()
                    );
                END
            """
            status_val = data.get("status", "Selesai")
            catatan_val = data.get("catatan", "")
            foto_val = data.get("foto_url", "")
            clean_val = data.get("cleanliness_percentage")
            dirt_val = data.get("dirtiness_percentage")
            phys_val = data.get("physical_condition_percentage")
            ai_val = data.get("ai_status", "")
            insp_val = data.get("inspection_id")

            cursor.execute(
                query,
                (
                    task_id,
                    status_val, catatan_val, foto_val, clean_val, dirt_val, phys_val, ai_val, insp_val,
                    task_id,
                    task_id,
                    f"Tugas {task_id}",
                    status_val, catatan_val, foto_val, clean_val, dirt_val, phys_val, ai_val, insp_val,
                )
            )
            conn.commit()
            return True

    def ensure_damage_reports_table(self) -> None:
        """Memastikan tabel DamageReports tersedia di Microsoft SQL Server beserta data awal"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                IF OBJECT_ID('dbo.DamageReports', 'U') IS NULL
                BEGIN
                    CREATE TABLE DamageReports (
                        report_id VARCHAR(30) PRIMARY KEY,
                        judul VARCHAR(200) NOT NULL,
                        lokasi VARCHAR(150) NOT NULL,
                        pelapor VARCHAR(100) DEFAULT 'Rian (Petugas)',
                        urgensi VARCHAR(30) DEFAULT 'Mendesak',
                        tanggal VARCHAR(30) NOT NULL,
                        jam VARCHAR(20) NOT NULL,
                        status VARCHAR(40) DEFAULT 'Dalam Peninjauan',
                        kategori NVARCHAR(300) NULL,
                        catatan NVARCHAR(MAX) NULL,
                        foto_url NVARCHAR(MAX) NULL,
                        created_at DATETIME DEFAULT GETDATE()
                    );
                END
            """)
            cursor.execute("SELECT COUNT(*) FROM DamageReports")
            cnt = cursor.fetchone()[0]
            if cnt == 0:
                seed_rows = [
                    (
                        "REP-001",
                        "Kebocoran Pipa Toilet Gedung A",
                        "Lt.1 - Gedung A",
                        "Rian (Petugas)",
                        "Mendesak",
                        "01 Sep 2026",
                        "09:30",
                        "Dalam Peninjauan",
                        "Butuh peninjauan segera, Kerusakan total",
                        "Pipa bawah wastafel mengalami rembesan air dan perlu peninjauan segera.",
                        "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&auto=format&fit=crop&q=80",
                    ),
                    (
                        "REP-002",
                        "Keran Air Toilet Gedung A",
                        "Lt.1 - Gedung A",
                        "Ali (Petugas)",
                        "Mendesak",
                        "28 Sep 2026",
                        "16:00",
                        "Dalam Peninjauan",
                        "Butuh peninjauan segera",
                        "Keran wastafel longgar dan air menetes terus menerus.",
                        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80",
                    ),
                    (
                        "REP-003",
                        "Koridor Gedung A",
                        "Lt.1 - Gedung A",
                        "Mees (Petugas)",
                        "Tinggi",
                        "01 Sep 2026",
                        "08:00",
                        "Dalam Peninjauan",
                        "Perlu pemeliharaan lebih lanjut",
                        "Penerangan koridor dan kebersihan area selasar gedung A.",
                        "https://images.unsplash.com/photo-1562774053-701939374585?w=400&auto=format&fit=crop&q=80",
                    ),
                ]
                for sr in seed_rows:
                    cursor.execute("""
                        INSERT INTO DamageReports (
                            report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, sr)
            conn.commit()

    def get_damage_reports(self) -> List[Dict[str, Any]]:
        """Mengambil seluruh laporan kerusakan fasilitas dari tabel DamageReports SQL Server"""
        self.ensure_damage_reports_table()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
                FROM DamageReports
                ORDER BY created_at DESC, report_id DESC
            """)
            rows = cursor.fetchall()
            return [
                {
                    "id": row.report_id,
                    "judul": row.judul,
                    "lokasi": row.lokasi,
                    "pelapor": row.pelapor or "Rian (Petugas)",
                    "urgensi": row.urgensi or "Mendesak",
                    "tanggal": row.tanggal or "10 Okt 2026",
                    "jam": row.jam or "08:00",
                    "waktu": f"{row.tanggal or '10 Okt 2026'} • {row.jam or '08:00'}",
                    "status": row.status or "Dalam Peninjauan",
                    "kategori": [k.strip() for k in (row.kategori or "").split(",") if k.strip()],
                    "catatan": row.catatan or "",
                    "foto": row.foto_url or "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&auto=format&fit=crop&q=80",
                }
                for row in rows
            ]

    def create_damage_report(self, report: Dict[str, Any]) -> str:
        """Menyimpan laporan kerusakan baru dari Petugas ke tabel DamageReports SQL Server"""
        self.ensure_damage_reports_table()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rep_id = report.get("id") or f"REP-{int(datetime.now().timestamp()) % 1000:03d}"
            judul = report.get("judul") or "Toilet Lt.1"
            lokasi = report.get("lokasi") or "Lt.1 - Gedung A"
            pelapor = report.get("pelapor") or "Rian (Petugas)"
            urgensi = report.get("urgensi") or "Mendesak"
            tanggal = report.get("tanggal") or "10 Okt 2026"
            jam = report.get("jam") or "08:00"
            status = report.get("status") or "Dalam Peninjauan"
            kat_raw = report.get("kategori")
            if isinstance(kat_raw, list):
                kategori = ", ".join(kat_raw)
            else:
                kategori = str(kat_raw or "")
            catatan = report.get("catatan") or ""
            foto_url = report.get("foto") or report.get("foto_url") or ""

            cursor.execute("""
                IF EXISTS (SELECT 1 FROM DamageReports WHERE report_id = ?)
                BEGIN
                    UPDATE DamageReports
                    SET judul = ?, lokasi = ?, pelapor = ?, urgensi = ?, tanggal = ?, jam = ?,
                        status = ?, kategori = ?, catatan = ?, foto_url = ?
                    WHERE report_id = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO DamageReports (
                        report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                END
            """, (
                rep_id,
                judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url,
                rep_id,
                rep_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
            ))
            conn.commit()
            return rep_id

    def update_damage_report_status(self, report_id: str, status: str) -> bool:
        """Mengubah status laporan kerusakan di tabel DamageReports SQL Server"""
        self.ensure_damage_reports_table()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE DamageReports SET status = ? WHERE report_id = ?",
                (status, report_id)
            )
            updated = cursor.rowcount > 0
            conn.commit()
            return updated

    def ensure_officers_table(self) -> None:
        """Memastikan tabel Officers (Petugas) tersedia di Microsoft SQL Server"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                IF OBJECT_ID('dbo.Officers', 'U') IS NULL
                BEGIN
                    CREATE TABLE Officers (
                        officer_id VARCHAR(30) PRIMARY KEY,
                        name VARCHAR(120) NOT NULL,
                        email VARCHAR(120) NOT NULL,
                        password VARCHAR(100) DEFAULT '123',
                        role VARCHAR(150) DEFAULT 'Petugas Pemeliharaan Fasilitas',
                        shift VARCHAR(100) DEFAULT 'Shift Pagi (07:00 - 15:00)',
                        area VARCHAR(150) DEFAULT 'Gedung A & Perpustakaan',
                        phone VARCHAR(50) DEFAULT '0812-3456-7890',
                        avatar_url NVARCHAR(MAX) NULL,
                        status_text VARCHAR(50) DEFAULT 'Aktif Bertugas',
                        created_at DATETIME DEFAULT GETDATE()
                    );
                END
            """)
            conn.commit()

    def get_officers(self) -> List[Dict[str, Any]]:
        """Mengambil seluruh daftar petugas lapangan dari tabel Officers di Microsoft SQL Server"""
        self.ensure_officers_table()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT officer_id, name, email, password, role, shift, area, phone, avatar_url, status_text
                FROM Officers
                ORDER BY officer_id ASC
            """)
            rows = cursor.fetchall()
            return [
                {
                    "id": row.officer_id,
                    "name": row.name,
                    "email": row.email,
                    "password": row.password or "123",
                    "role": row.role or "Petugas Pemeliharaan Fasilitas",
                    "shift": row.shift or "Shift Pagi (07:00 - 15:00)",
                    "area": row.area or "Gedung A",
                    "phone": row.phone or "0812-3456-7890",
                    "avatarUri": row.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
                    "statusText": row.status_text or "Aktif Bertugas",
                    "completionRate": 95,
                }
                for row in rows
            ]

    def create_or_update_officer(self, officer: Dict[str, Any]) -> Dict[str, Any]:
        """Mendaftarkan petugas baru (dengan auto-generate ID PTG-xxx) atau memperbarui profil petugas di SQL Server"""
        self.ensure_officers_table()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            off_id = (officer.get("id") or "").strip().upper()
            if not off_id:
                cursor.execute("SELECT officer_id FROM Officers")
                existing_ids = [r[0] for r in cursor.fetchall()]
                max_num = 0
                for eid in existing_ids:
                    digits = "".join(c for c in str(eid) if c.isdigit())
                    if digits:
                        max_num = max(max_num, int(digits))
                off_id = f"PTG-{max_num + 1:03d}"

            name = (officer.get("name") or "Petugas Baru").strip()
            email = (officer.get("email") or f"{name.lower().replace(' ', '.')}@kampus.ac.id").strip()
            password = (officer.get("password") or "123").strip()
            role = (officer.get("role") or "Petugas Pemeliharaan Fasilitas").strip()
            shift = (officer.get("shift") or "Shift Pagi (07:00 - 15:00)").strip()
            area = (officer.get("area") or "Gedung A").strip()
            phone = (officer.get("phone") or "0812-3456-7890").strip()
            avatar_url = officer.get("avatarUri") or officer.get("avatar_url") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
            status_text = (officer.get("statusText") or officer.get("status_text") or "Aktif Bertugas").strip()

            cursor.execute("""
                IF EXISTS (SELECT 1 FROM Officers WHERE officer_id = ?)
                BEGIN
                    UPDATE Officers
                    SET name = ?, email = ?, password = ?, role = ?, shift = ?, area = ?, phone = ?, avatar_url = ?, status_text = ?
                    WHERE officer_id = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO Officers (
                        officer_id, name, email, password, role, shift, area, phone, avatar_url, status_text
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                END
            """, (
                off_id,
                name, email, password, role, shift, area, phone, avatar_url, status_text,
                off_id,
                off_id, name, email, password, role, shift, area, phone, avatar_url, status_text
            ))
            conn.commit()
            return {
                "id": off_id,
                "name": name,
                "email": email,
                "password": password,
                "role": role,
                "shift": shift,
                "area": area,
                "phone": phone,
                "avatarUri": avatar_url,
                "statusText": status_text,
                "completionRate": 95,
            }

if __name__ == "__main__":
    print("=" * 60)
    print("INISIALISASI & UJI KONEKSI DATABASE SQL SERVER")
    print("=" * 60)
    db = DatabaseManager()
    print(f"Server   : {db.server}")
    print(f"Database : {db.database}")
    print(f"Mode     : {'Windows Authentication' if db.trusted_connection else 'SQL Authentication'}")
    print("\n[1/3] Menyiapkan database dan tabel dari schema.sql...")
    init_res = db.init_database()
    print(f"Hasil    : {init_res['message']}")

    print("\n[2/3] Menguji koneksi database...")
    status = db.test_connection()
    print(f"Status   : {status['status']}")

    print("\n[3/3] Memeriksa daftar ruangan (Master Data)...")
    rooms = db.get_rooms()
    print(f"Total Ruangan Ditemukan: {len(rooms)}")
    for r in rooms:
        print(f" - [{r['room_code']}] {r['room_name']} ({r['building']}, Lt.{r['floor_number']})")
    print("=" * 60)
    print("[SUKSES] Database siap digunakan!")

