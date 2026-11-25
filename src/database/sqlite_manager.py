import os
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional


class SQLiteDatabaseManager:
    """
    Fallback SQLite ringan agar aplikasi cloud tetap menyala tanpa crash
    bahkan sebelum DATABASE_URL (PostgreSQL) dihubungkan.
    """

    def __init__(self, db_path: str = "campus_facility.db"):
        self.db_path = db_path
        self._init_schema()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS rooms (
                    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_code TEXT UNIQUE NOT NULL,
                    room_name TEXT NOT NULL,
                    building TEXT NOT NULL,
                    floor_number INTEGER DEFAULT 1,
                    room_type TEXT DEFAULT 'Fasilitas',
                    status TEXT DEFAULT 'Aktif'
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inspections (
                    inspection_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id INTEGER,
                    inspection_date TEXT DEFAULT CURRENT_TIMESTAMP,
                    image_original_path TEXT,
                    image_annotated_path TEXT,
                    image_original_data BLOB,
                    image_annotated_data BLOB,
                    cleanliness_percentage REAL DEFAULT 100,
                    total_defects INTEGER DEFAULT 0,
                    total_trash INTEGER DEFAULT 0,
                    severity_level TEXT DEFAULT 'None',
                    status TEXT DEFAULT 'Pending Review',
                    notes TEXT
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    asset_code TEXT,
                    judul TEXT NOT NULL,
                    lokasi TEXT NOT NULL,
                    petugas TEXT NOT NULL,
                    prioritas TEXT DEFAULT 'Normal',
                    tenggat TEXT,
                    deskripsi TEXT,
                    status TEXT DEFAULT 'Menunggu',
                    catatan TEXT,
                    foto_url TEXT,
                    cleanliness_percentage REAL,
                    dirtiness_percentage REAL,
                    physical_condition_percentage REAL,
                    ai_status TEXT,
                    inspection_id INTEGER,
                    completed_at TEXT
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS damage_reports (
                    report_id TEXT PRIMARY KEY,
                    judul TEXT NOT NULL,
                    lokasi TEXT NOT NULL,
                    pelapor TEXT DEFAULT 'Petugas',
                    urgensi TEXT DEFAULT 'Mendesak',
                    tanggal TEXT NOT NULL,
                    jam TEXT NOT NULL,
                    status TEXT DEFAULT 'Dalam Peninjauan',
                    kategori TEXT,
                    catatan TEXT,
                    foto_url TEXT
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS officers (
                    officer_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    password TEXT DEFAULT '123',
                    role TEXT DEFAULT 'Petugas Pemeliharaan Fasilitas',
                    shift TEXT DEFAULT 'Shift Pagi (07:00 - 15:00)',
                    area TEXT DEFAULT 'Gedung A & Perpustakaan',
                    phone TEXT DEFAULT '0812-3456-7890',
                    avatar_url TEXT,
                    status_text TEXT DEFAULT 'Aktif Bertugas'
                );
            """)
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
                    "INSERT OR IGNORE INTO rooms (room_code, room_name, building, floor_number, room_type, status) VALUES (?, ?, ?, ?, ?, ?);",
                    seed_rooms,
                )
            conn.commit()

    def test_connection(self) -> Dict[str, Any]:
        return {"status": "connected", "engine": "SQLite (Fallback)"}

    def get_rooms(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM rooms ORDER BY room_id ASC;").fetchall()
            return [dict(r) for r in rows]

    def add_room(self, room_code: Any, room_name: str = "", building: str = "", floor_number: int = 1, room_type: str = "Fasilitas", status: str = "Aktif") -> int:
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
            cur = conn.execute(
                "INSERT OR REPLACE INTO rooms (room_code, room_name, building, floor_number, room_type, status) VALUES (?, ?, ?, ?, ?, ?);",
                (room_code, room_name, building, floor_number, room_type, status),
            )
            conn.commit()
            return cur.lastrowid

    def update_room_status(self, room_code: str, status: str) -> bool:
        with self.get_connection() as conn:
            cur = conn.execute("UPDATE rooms SET status = ? WHERE room_code = ?;", (status, room_code))
            conn.commit()
            return cur.rowcount > 0

    def save_inspection(self, room_id: int, cleanliness_percentage: float, total_defects: int, total_trash: int, severity_level: str, detections: List[Dict[str, Any]], image_original_path: Optional[str] = None, image_annotated_path: Optional[str] = None, image_original_bytes: Optional[bytes] = None, image_annotated_bytes: Optional[bytes] = None, notes: Optional[str] = None) -> int:
        with self.get_connection() as conn:
            cur = conn.execute(
                """INSERT INTO inspections (room_id, image_original_path, image_annotated_path, image_original_data, image_annotated_data, cleanliness_percentage, total_defects, total_trash, severity_level, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (room_id, image_original_path, image_annotated_path, image_original_bytes, image_annotated_bytes, cleanliness_percentage, total_defects, total_trash, severity_level, notes),
            )
            conn.commit()
            return cur.lastrowid

    def get_inspection_image(self, inspection_id: int, img_type: str = "annotated") -> Optional[bytes]:
        col = "image_annotated_data" if img_type == "annotated" else "image_original_data"
        with self.get_connection() as conn:
            row = conn.execute(f"SELECT {col} FROM inspections WHERE inspection_id = ?;", (inspection_id,)).fetchone()
            return bytes(row[0]) if row and row[0] else None

    def cleanup_old_photos(self, retention_days: int = 90) -> int:
        return 0

    def get_recent_inspections(self, limit: int = 15) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute(
                """SELECT i.*, COALESCE(r.room_code, 'AST-001') AS room_code, COALESCE(r.room_name, 'Fasilitas Kampus') AS room_name,
                          COALESCE(r.building, 'Gedung Kampus') AS building, COALESCE(r.floor_number, 1) AS floor_number
                   FROM inspections i LEFT JOIN rooms r ON i.room_id = r.room_id
                   ORDER BY i.inspection_id DESC LIMIT ?;""",
                (limit,),
            ).fetchall()
            return [
                {
                    "inspection_id": r["inspection_id"],
                    "inspection_date": r["inspection_date"] or "",
                    "room_code": r["room_code"],
                    "room_name": r["room_name"],
                    "building": r["building"],
                    "floor_number": r["floor_number"],
                    "cleanliness_percentage": r["cleanliness_percentage"],
                    "total_defects": r["total_defects"],
                    "total_trash": r["total_trash"],
                    "severity_level": r["severity_level"],
                    "status": r["status"],
                    "notes": r["notes"],
                    "image_url": f"/api/inspections/{r['inspection_id']}/image/annotated",
                }
                for r in rows
            ]

    def get_tasks(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM tasks ORDER BY task_id DESC;").fetchall()
            return [
                {
                    "id": r["task_id"],
                    "assetCode": r["asset_code"],
                    "judul": r["judul"],
                    "lokasi": r["lokasi"],
                    "petugas": r["petugas"],
                    "prioritas": r["prioritas"],
                    "tenggat": r["tenggat"] or datetime.now().strftime("%Y-%m-%d"),
                    "deskripsi": r["deskripsi"] or "",
                    "status": r["status"],
                    "catatan": r["catatan"] or "",
                    "foto": r["foto_url"] or "",
                    "cleanlinessPercentage": r["cleanliness_percentage"],
                    "dirtinessPercentage": r["dirtiness_percentage"],
                    "physicalConditionPercentage": r["physical_condition_percentage"],
                    "aiStatus": r["ai_status"] or "",
                    "inspectionId": r["inspection_id"],
                    "completedAt": r["completed_at"],
                }
                for r in rows
            ]

    def create_task(self, task: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO tasks (task_id, asset_code, judul, lokasi, petugas, prioritas, tenggat, deskripsi, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (task["id"], task.get("assetCode"), task["judul"], task["lokasi"], task["petugas"], task.get("prioritas", "Normal"), task.get("tenggat") or datetime.now().strftime("%Y-%m-%d"), task.get("deskripsi", ""), task.get("status", "Menunggu")),
            )
            conn.commit()
            return task["id"]

    def update_task_completion(self, task_id: str, data: Dict[str, Any]) -> bool:
        with self.get_connection() as conn:
            conn.execute(
                """UPDATE tasks SET status = ?, catatan = ?, foto_url = COALESCE(NULLIF(?, ''), foto_url),
                   cleanliness_percentage = COALESCE(?, cleanliness_percentage),
                   dirtiness_percentage = COALESCE(?, dirtiness_percentage),
                   physical_condition_percentage = COALESCE(?, physical_condition_percentage),
                   ai_status = ?, inspection_id = COALESCE(?, inspection_id), completed_at = ?
                   WHERE task_id = ?;""",
                (data.get("status", "Selesai"), data.get("catatan", ""), data.get("foto_url", ""), data.get("cleanliness_percentage"), data.get("dirtiness_percentage"), data.get("physical_condition_percentage"), data.get("ai_status", ""), data.get("inspection_id"), datetime.now().strftime("%Y-%m-%d"), task_id),
            )
            conn.commit()
            return True

    def get_damage_reports(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM damage_reports ORDER BY report_id DESC;").fetchall()
            return [
                {
                    "id": r["report_id"],
                    "judul": r["judul"],
                    "lokasi": r["lokasi"],
                    "pelapor": r["pelapor"] or "Petugas",
                    "urgensi": r["urgensi"] or "Mendesak",
                    "tanggal": r["tanggal"],
                    "jam": r["jam"],
                    "waktu": f"{r['tanggal']} • {r['jam']}",
                    "status": r["status"] or "Dalam Peninjauan",
                    "kategori": [k.strip() for k in (r["kategori"] or "").split(",") if k.strip()],
                    "catatan": r["catatan"] or "",
                    "foto": r["foto_url"] or "",
                }
                for r in rows
            ]

    def create_damage_report(self, report: Dict[str, Any]) -> str:
        rep_id = report.get("id") or f"REP-{int(datetime.now().timestamp()) % 1000:03d}"
        kat_raw = report.get("kategori")
        kategori = ", ".join(kat_raw) if isinstance(kat_raw, list) else str(kat_raw or "")
        with self.get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO damage_reports (report_id, judul, lokasi, pelapor, urgensi, tanggal, jam, status, kategori, catatan, foto_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (rep_id, report.get("judul") or "Laporan", report.get("lokasi") or "Gedung Kampus", report.get("pelapor") or "Petugas", report.get("urgensi") or "Mendesak", report.get("tanggal") or datetime.now().strftime("%d %b %Y"), report.get("jam") or datetime.now().strftime("%H:%M"), report.get("status") or "Dalam Peninjauan", kategori, report.get("catatan") or "", report.get("foto") or report.get("foto_url") or ""),
            )
            conn.commit()
            return rep_id

    def update_damage_report_status(self, report_id: str, status: str) -> bool:
        with self.get_connection() as conn:
            cur = conn.execute("UPDATE damage_reports SET status = ? WHERE report_id = ?;", (status, report_id))
            conn.commit()
            return cur.rowcount > 0

    def get_officers(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM officers ORDER BY officer_id ASC;").fetchall()
            return [
                {
                    "id": r["officer_id"],
                    "name": r["name"],
                    "email": r["email"],
                    "password": r["password"] or "123",
                    "role": r["role"] or "Petugas Pemeliharaan Fasilitas",
                    "shift": r["shift"] or "Shift Pagi (07:00 - 15:00)",
                    "area": r["area"] or "Gedung A",
                    "phone": r["phone"] or "0812-3456-7890",
                    "avatarUri": r["avatar_url"] or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
                    "statusText": r["status_text"] or "Aktif Bertugas",
                    "completionRate": 95,
                }
                for r in rows
            ]

    def create_or_update_officer(self, officer: Dict[str, Any]) -> Dict[str, Any]:
        with self.get_connection() as conn:
            off_id = (officer.get("id") or "").strip().upper()
            if not off_id:
                existing = [r[0] for r in conn.execute("SELECT officer_id FROM officers;").fetchall()]
                max_num = max([int("".join(c for c in str(e) if c.isdigit()) or "0") for e in existing], default=0)
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
            conn.execute(
                """INSERT OR REPLACE INTO officers (officer_id, name, email, password, role, shift, area, phone, avatar_url, status_text)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (off_id, name, email, password, role, shift, area, phone, avatar_url, status_text),
            )
            conn.commit()
            return {"id": off_id, "name": name, "email": email, "password": password, "role": role, "shift": shift, "area": area, "phone": phone, "avatarUri": avatar_url, "statusText": status_text, "completionRate": 95}
