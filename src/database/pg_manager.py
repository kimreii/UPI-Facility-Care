import os
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor


class PostgresDatabaseManager:
    """
    Adapter PostgreSQL untuk deployment Cloud (Railway) dengan antarmuka
    identik dengan DatabaseManager (Microsoft SQL Server).
    """

    def __init__(self, database_url: Optional[str] = None):
        raw_url = database_url or os.getenv("DATABASE_URL", "") or os.getenv("DATABASE_PRIVATE_URL", "")
        if raw_url.startswith("postgres://"):
            raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        self.database_url = raw_url
        for attempt in range(5):
            try:
                self._init_schema()
                break
            except Exception as e:
                print(f"[PG_INIT] Percobaan {attempt + 1}/5 gagal: {e}")
                if attempt < 4:
                    time.sleep(2)

    def get_connection(self):
        return psycopg2.connect(self.database_url)

    def _init_schema(self) -> None:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS rooms (
                        room_id SERIAL PRIMARY KEY,
                        room_code VARCHAR(30) UNIQUE NOT NULL,
                        room_name VARCHAR(150) NOT NULL,
                        building VARCHAR(100) NOT NULL,
                        floor_number INT DEFAULT 1,
                        room_type VARCHAR(50) DEFAULT 'Fasilitas',
                        status VARCHAR(30) DEFAULT 'Aktif',
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS inspections (
                        inspection_id SERIAL PRIMARY KEY,
                        room_id INT REFERENCES rooms(room_id) ON DELETE SET NULL,
                        inspection_date TIMESTAMP DEFAULT NOW(),
                        image_original_path TEXT,
                        image_annotated_path TEXT,
                        image_original_data BYTEA,
                        image_annotated_data BYTEA,
                        cleanliness_percentage DOUBLE PRECISION DEFAULT 100,
                        total_defects INT DEFAULT 0,
                        total_trash INT DEFAULT 0,
                        severity_level VARCHAR(50) DEFAULT 'None',
                        status VARCHAR(50) DEFAULT 'Pending Review',
                        notes TEXT
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS defects (
                        defect_id SERIAL PRIMARY KEY,
                        inspection_id INT REFERENCES inspections(inspection_id) ON DELETE CASCADE,
                        category VARCHAR(50),
                        class_name VARCHAR(100),
                        confidence DOUBLE PRECISION,
                        bbox_x INT,
                        bbox_y INT,
                        bbox_width INT,
                        bbox_height INT,
                        area_percentage DOUBLE PRECISION
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS tasks (
                        task_id VARCHAR(40) PRIMARY KEY,
                        asset_code VARCHAR(40),
                        judul VARCHAR(200) NOT NULL,
                        lokasi VARCHAR(150) NOT NULL,
                        petugas VARCHAR(120) NOT NULL,
                        prioritas VARCHAR(30) DEFAULT 'Normal',
                        tenggat VARCHAR(40),
                        deskripsi TEXT,
                        status VARCHAR(30) DEFAULT 'Menunggu',
                        catatan TEXT,
                        foto_url TEXT,
                        cleanliness_percentage DOUBLE PRECISION,
                        dirtiness_percentage DOUBLE PRECISION,
                        physical_condition_percentage DOUBLE PRECISION,
                        ai_status VARCHAR(100),
                        inspection_id INT,
                        completed_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS damage_reports (
                        report_id VARCHAR(30) PRIMARY KEY,
                        judul VARCHAR(200) NOT NULL,
                        lokasi VARCHAR(150) NOT NULL,
                        pelapor VARCHAR(100) DEFAULT 'Petugas',
                        urgensi VARCHAR(30) DEFAULT 'Mendesak',
                        tanggal VARCHAR(30) NOT NULL,
                        jam VARCHAR(20) NOT NULL,
                        status VARCHAR(40) DEFAULT 'Dalam Peninjauan',
                        kategori TEXT,
                        catatan TEXT,
                        foto_url TEXT,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS officers (
                        officer_id VARCHAR(30) PRIMARY KEY,
                        name VARCHAR(120) NOT NULL,
                        email VARCHAR(120) NOT NULL,
                        password VARCHAR(100) DEFAULT '123',
                        role VARCHAR(150) DEFAULT 'Petugas Pemeliharaan Fasilitas',
                        shift VARCHAR(100) DEFAULT 'Shift Pagi (07:00 - 15:00)',
                        area VARCHAR(150) DEFAULT 'Gedung A & Perpustakaan',
                        phone VARCHAR(50) DEFAULT '0812-3456-7890',
                        avatar_url TEXT,
                        status_text VARCHAR(50) DEFAULT 'Aktif Bertugas',
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                """)

                # Seed daftar master ruangan kampus jika masih kosong
                cur.execute("SELECT COUNT(*) FROM rooms;")
                if cur.fetchone()[0] == 0:
                    seed_rooms = [
                        ("AST-001", "Toilet Gedung A", "Gedung A", 2, "Toilet", "Aktif"),
                        ("AST-002", "Ballroom Gedung A", "Gedung A", 5, "Ballroom", "Aktif"),
                        ("AST-003", "Toilet Gedung A", "Gedung A", 1, "Toilet", "Aktif"),
                        ("AST-004", "Koridor Gedung C", "Gedung C", 3, "Koridor", "Aktif"),
                        ("AST-005", "Perpustakaan", "Gedung A", 1, "Perpustakaan", "Aktif"),
                        ("AST-006", "Koridor Prodi", "Prodi Bisnis", 3, "Koridor", "Aktif"),
                        ("LAB-AI-1", "Lab Artificial Intelligence", "Gedung Fakultas Ilmu Komputer", 2, "Lab", "Aktif"),
                        ("R-101", "Ruang Kuliah Teori 101", "Gedung A", 1, "Classroom", "Aktif"),
                        ("R-204", "Ruang Seminar 204", "Gedung B", 2, "Classroom", "Aktif"),
                        ("TL-01", "Toilet Gedung A Lantai 2", "Gedung A", 2, "Toilet", "Aktif"),
                    ]
                    cur.executemany(
                        """
                        INSERT INTO rooms (room_code, room_name, building, floor_number, room_type, status)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (room_code) DO NOTHING;
                        """,
                        seed_rooms,
                    )
            conn.commit()

    def test_connection(self) -> Dict[str, Any]:
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT version();")
                    ver = cur.fetchone()[0]
                    return {
                        "status": "connected",
                        "engine": "PostgreSQL (Cloud)",
                        "version": ver.split(",")[0],
                    }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_rooms(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT room_id, room_code, room_name, building, floor_number, room_type, status
                    FROM rooms
                    ORDER BY room_id ASC;
                    """
                )
                return [dict(r) for r in cur.fetchall()]

    def add_room(
        self,
        room_code: Any,
        room_name: str = "",
        building: str = "",
        floor_number: int = 1,
        room_type: str = "Fasilitas",
        status: str = "Aktif",
    ) -> int:
        if isinstance(room_code, dict):
            d = room_code
            room_code = d.get("room_code") or d.get("id") or f"AST-{int(datetime.now().timestamp()) % 10000}"
            room_name = d.get("room_name") or d.get("nama") or room_code
            building = d.get("building") or d.get("gedung") or "Gedung Utama"
            try:
                floor_number = int(str(d.get("floor_number") or d.get("lantai") or 1).replace("Lantai", "").strip() or 1)
            except Exception:
                floor_number = 1
            room_type = d.get("room_type") or d.get("kategori") or "Fasilitas"
            status = d.get("status") or "Aktif"
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO rooms (room_code, room_name, building, floor_number, room_type, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (room_code) DO UPDATE
                    SET room_name = EXCLUDED.room_name,
                        building = EXCLUDED.building,
                        floor_number = EXCLUDED.floor_number,
                        room_type = EXCLUDED.room_type,
                        status = EXCLUDED.status
                    RETURNING room_id;
                    """,
                    (room_code, room_name, building, floor_number, room_type, status),
                )
                rid = cur.fetchone()[0]
            conn.commit()
            return rid

    def update_room_status(self, room_code: str, status: str) -> bool:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE rooms SET status = %s WHERE room_code = %s;",
                    (status, room_code),
                )
                updated = cur.rowcount > 0
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
        notes: Optional[str] = None,
    ) -> int:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Pastikan room_id valid agar FK tidak gagal
                cur.execute("SELECT room_id FROM rooms WHERE room_id = %s;", (room_id,))
                if cur.fetchone() is None:
                    cur.execute("SELECT room_id FROM rooms ORDER BY room_id ASC LIMIT 1;")
                    first = cur.fetchone()
                    room_id = first[0] if first else None

                cur.execute(
                    """
                    INSERT INTO inspections (
                        room_id, image_original_path, image_annotated_path,
                        image_original_data, image_annotated_data,
                        cleanliness_percentage, total_defects, total_trash,
                        severity_level, status, notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending Review', %s)
                    RETURNING inspection_id;
                    """,
                    (
                        room_id,
                        image_original_path,
                        image_annotated_path,
                        psycopg2.Binary(image_original_bytes) if image_original_bytes else None,
                        psycopg2.Binary(image_annotated_bytes) if image_annotated_bytes else None,
                        cleanliness_percentage,
                        total_defects,
                        total_trash,
                        severity_level,
                        notes,
                    ),
                )
                inspection_id = cur.fetchone()[0]

                for item in detections:
                    bbox = item["bbox"]
                    cur.execute(
                        """
                        INSERT INTO defects (
                            inspection_id, category, class_name, confidence,
                            bbox_x, bbox_y, bbox_width, bbox_height, area_percentage
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (
                            inspection_id,
                            item["category"],
                            item["class_name"],
                            item["confidence"],
                            bbox["x"],
                            bbox["y"],
                            bbox["width"],
                            bbox["height"],
                            item["area_percentage"],
                        ),
                    )
            conn.commit()
            return inspection_id

    def get_inspection_image(self, inspection_id: int, img_type: str = "annotated") -> Optional[bytes]:
        col = "image_annotated_data" if img_type == "annotated" else "image_original_data"
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT {col} FROM inspections WHERE inspection_id = %s;", (inspection_id,))
                row = cur.fetchone()
                if row and row[0] is not None:
                    return bytes(row[0])
                return None

    def cleanup_old_photos(self, retention_days: int = 90) -> int:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE inspections
                    SET image_original_data = NULL, image_annotated_data = NULL
                    WHERE inspection_date < NOW() - (%s || ' days')::INTERVAL
                      AND (image_original_data IS NOT NULL OR image_annotated_data IS NOT NULL);
                    """,
                    (retention_days,),
                )
                count = cur.rowcount
            conn.commit()
            return count

    def get_recent_inspections(self, limit: int = 15) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        i.inspection_id, i.inspection_date,
                        COALESCE(r.room_code, 'AST-001') AS room_code,
                        COALESCE(r.room_name, 'Fasilitas Kampus') AS room_name,
                        COALESCE(r.building, 'Gedung Kampus') AS building,
                        COALESCE(r.floor_number, 1) AS floor_number,
                        i.image_original_path, i.image_annotated_path,
                        i.cleanliness_percentage, i.total_defects, i.total_trash,
                        i.severity_level, i.status, i.notes
                    FROM inspections i
                    LEFT JOIN rooms r ON i.room_id = r.room_id
                    ORDER BY i.inspection_date DESC
                    LIMIT %s;
                    """,
                    (limit,),
                )
                rows = cur.fetchall()
                return [
                    {
                        "inspection_id": row["inspection_id"],
                        "inspection_date": row["inspection_date"].strftime("%Y-%m-%d %H:%M:%S")
                        if row["inspection_date"]
                        else "",
                        "room_code": row["room_code"],
                        "room_name": row["room_name"],
                        "building": row["building"],
                        "floor_number": row["floor_number"],
                        "image_original_path": row["image_original_path"],
                        "image_annotated_path": row["image_annotated_path"],
                        "cleanliness_percentage": row["cleanliness_percentage"],
                        "total_defects": row["total_defects"],
                        "total_trash": row["total_trash"],
                        "severity_level": row["severity_level"],
                        "status": row["status"],
                        "notes": row["notes"],
                        "image_url": f"/api/inspections/{row['inspection_id']}/image/annotated",
                    }
                    for row in rows
                ]

    def get_tasks(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        task_id, asset_code, judul, lokasi, petugas, prioritas,
                        tenggat, deskripsi, status, catatan, foto_url,
                        cleanliness_percentage, dirtiness_percentage, physical_condition_percentage,
                        ai_status, inspection_id, completed_at
                    FROM tasks
                    ORDER BY created_at DESC, task_id ASC;
                    """
                )
                rows = cur.fetchall()
                return [
                    {
                        "id": row["task_id"],
                        "assetCode": row["asset_code"],
                        "judul": row["judul"],
                        "lokasi": row["lokasi"],
                        "petugas": row["petugas"],
                        "prioritas": row["prioritas"],
                        "tenggat": row["tenggat"] or datetime.now().strftime("%Y-%m-%d"),
                        "deskripsi": row["deskripsi"] or "",
                        "status": row["status"],
                        "catatan": row["catatan"] or "",
                        "foto": row["foto_url"] or "",
                        "cleanlinessPercentage": row["cleanliness_percentage"],
                        "dirtinessPercentage": row["dirtiness_percentage"],
                        "physicalConditionPercentage": row["physical_condition_percentage"],
                        "aiStatus": row["ai_status"] or "",
                        "inspectionId": row["inspection_id"],
                        "completedAt": row["completed_at"].strftime("%Y-%m-%d")
                        if row["completed_at"]
                        else None,
                    }
                    for row in rows
                ]

    def create_task(self, task: Dict[str, Any]) -> str:
        tenggat_val = task.get("tenggat") or datetime.now().strftime("%Y-%m-%d")
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO tasks (task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (task_id) DO UPDATE
                    SET asset_code = EXCLUDED.asset_code,
                        judul = EXCLUDED.judul,
                        lokasi = EXCLUDED.lokasi,
                        petugas = EXCLUDED.petugas,
                        prioritas = EXCLUDED.prioritas,
                        tenggat = EXCLUDED.tenggat,
                        deskripsi = EXCLUDED.deskripsi,
                        status = EXCLUDED.status;
                    """,
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
                    ),
                )
            conn.commit()
            return task["id"]

    def update_task_completion(self, task_id: str, data: Dict[str, Any]) -> bool:
        status_val = data.get("status", "Selesai")
        catatan_val = data.get("catatan", "")
        foto_val = data.get("foto_url", "")
        clean_val = data.get("cleanliness_percentage")
        dirt_val = data.get("dirtiness_percentage")
        phys_val = data.get("physical_condition_percentage")
        ai_val = data.get("ai_status", "")
        insp_val = data.get("inspection_id")

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO tasks (
                        task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi,
                        status, catatan, foto_url, cleanliness_percentage, dirtiness_percentage,
                        physical_condition_percentage, ai_status, inspection_id, completed_at
                    )
                    VALUES (
                        %s, 'AST-001', %s, 'Gedung Kampus', 'Petugas', 'Normal', %s,
                        'Tugas pemeliharaan fasilitas',
                        %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (task_id) DO UPDATE
                    SET status = EXCLUDED.status,
                        catatan = EXCLUDED.catatan,
                        foto_url = CASE WHEN EXCLUDED.foto_url <> '' THEN EXCLUDED.foto_url ELSE tasks.foto_url END,
                        cleanliness_percentage = COALESCE(EXCLUDED.cleanliness_percentage, tasks.cleanliness_percentage),
                        dirtiness_percentage = COALESCE(EXCLUDED.dirtiness_percentage, tasks.dirtiness_percentage),
                        physical_condition_percentage = COALESCE(EXCLUDED.physical_condition_percentage, tasks.physical_condition_percentage),
                        ai_status = EXCLUDED.ai_status,
                        inspection_id = COALESCE(EXCLUDED.inspection_id, tasks.inspection_id),
                        completed_at = NOW();
                    """,
                    (
                        task_id,
                        f"Tugas {task_id}",
                        datetime.now().strftime("%Y-%m-%d"),
                        status_val,
                        catatan_val,
                        foto_val or "",
                        clean_val,
                        dirt_val,
                        phys_val,
                        ai_val,
                        insp_val,
                    ),
                )
            conn.commit()
            return True

    def get_damage_reports(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
                    FROM damage_reports
                    ORDER BY created_at DESC, report_id DESC;
                    """
                )
                rows = cur.fetchall()
                return [
                    {
                        "id": row["report_id"],
                        "judul": row["judul"],
                        "lokasi": row["lokasi"],
                        "pelapor": row["pelapor"] or "Petugas",
                        "urgensi": row["urgensi"] or "Mendesak",
                        "tanggal": row["tanggal"] or datetime.now().strftime("%d %b %Y"),
                        "jam": row["jam"] or "08:00",
                        "waktu": f"{row['tanggal']} • {row['jam']}",
                        "status": row["status"] or "Dalam Peninjauan",
                        "kategori": [k.strip() for k in (row["kategori"] or "").split(",") if k.strip()],
                        "catatan": row["catatan"] or "",
                        "foto": row["foto_url"] or "",
                    }
                    for row in rows
                ]

    def create_damage_report(self, report: Dict[str, Any]) -> str:
        rep_id = report.get("id") or f"REP-{int(datetime.now().timestamp()) % 1000:03d}"
        judul = report.get("judul") or "Laporan Fasilitas"
        lokasi = report.get("lokasi") or "Gedung Kampus"
        pelapor = report.get("pelapor") or "Petugas"
        urgensi = report.get("urgensi") or "Mendesak"
        tanggal = report.get("tanggal") or datetime.now().strftime("%d %b %Y")
        jam = report.get("jam") or datetime.now().strftime("%H:%M")
        status = report.get("status") or "Dalam Peninjauan"
        kat_raw = report.get("kategori")
        kategori = ", ".join(kat_raw) if isinstance(kat_raw, list) else str(kat_raw or "")
        catatan = report.get("catatan") or ""
        foto_url = report.get("foto") or report.get("foto_url") or ""

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO damage_reports (
                        report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (report_id) DO UPDATE
                    SET judul = EXCLUDED.judul,
                        lokasi = EXCLUDED.lokasi,
                        pelapor = EXCLUDED.pelapor,
                        urgensi = EXCLUDED.urgensi,
                        tanggal = EXCLUDED.tanggal,
                        jam = EXCLUDED.jam,
                        status = EXCLUDED.status,
                        kategori = EXCLUDED.kategori,
                        catatan = EXCLUDED.catatan,
                        foto_url = EXCLUDED.foto_url;
                    """,
                    (rep_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url),
                )
            conn.commit()
            return rep_id

    def update_damage_report_status(self, report_id: str, status: str) -> bool:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE damage_reports SET status = %s WHERE report_id = %s;",
                    (status, report_id),
                )
                updated = cur.rowcount > 0
            conn.commit()
            return updated

    def get_officers(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT officer_id, name, email, password, role, shift, area, phone, avatar_url, status_text
                    FROM officers
                    ORDER BY officer_id ASC;
                    """
                )
                rows = cur.fetchall()
                return [
                    {
                        "id": row["officer_id"],
                        "name": row["name"],
                        "email": row["email"],
                        "password": row["password"] or "123",
                        "role": row["role"] or "Petugas Pemeliharaan Fasilitas",
                        "shift": row["shift"] or "Shift Pagi (07:00 - 15:00)",
                        "area": row["area"] or "Gedung A",
                        "phone": row["phone"] or "0812-3456-7890",
                        "avatarUri": row["avatar_url"]
                        or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
                        "statusText": row["status_text"] or "Aktif Bertugas",
                        "completionRate": 95,
                    }
                    for row in rows
                ]

    def create_or_update_officer(self, officer: Dict[str, Any]) -> Dict[str, Any]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                off_id = (officer.get("id") or "").strip().upper()
                if not off_id:
                    cur.execute("SELECT officer_id FROM officers;")
                    existing_ids = [r[0] for r in cur.fetchall()]
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
                avatar_url = (
                    officer.get("avatarUri")
                    or officer.get("avatar_url")
                    or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                )
                status_text = (officer.get("statusText") or officer.get("status_text") or "Aktif Bertugas").strip()

                cur.execute(
                    """
                    INSERT INTO officers (
                        officer_id, name, email, password, role, shift, area, phone, avatar_url, status_text
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (officer_id) DO UPDATE
                    SET name = EXCLUDED.name,
                        email = EXCLUDED.email,
                        password = EXCLUDED.password,
                        role = EXCLUDED.role,
                        shift = EXCLUDED.shift,
                        area = EXCLUDED.area,
                        phone = EXCLUDED.phone,
                        avatar_url = EXCLUDED.avatar_url,
                        status_text = EXCLUDED.status_text;
                    """,
                    (off_id, name, email, password, role, shift, area, phone, avatar_url, status_text),
                )
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
