import os
import shutil
import threading
import uuid
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from src.core.analyzer import FacilityAnalyzer

app = FastAPI(
    title="Campus Facility AI Vision API",
    description="Backend API for Campus Facility Maintenance with AI Computer Vision & Database",
    version="1.0.0"
)

# Izinkan CORS agar dashboard frontend bisa terhubung
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder static web (Seluruh foto disimpan langsung ke dalam Database BLOB, tanpa folder uploads lokal)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Inisialisasi Modul AI dan Database (Otomatis pilih PostgreSQL di Cloud/Railway atau SQL Server di Lokal)
analyzer = FacilityAnalyzer(model_path=os.getenv("MODEL_PATH", "models/yolov8n.pt"))
AI_INFERENCE_LOCK = threading.Lock()


def _run_ai_analysis_safe(img):
    """Resize foto beresolusi terlalu tinggi (kamera HP) dan jalankan YOLOv8 secara thread-safe."""
    import cv2
    h, w = img.shape[:2]
    max_dim = 960
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img = cv2.resize(img, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)
    with AI_INFERENCE_LOCK:
        return analyzer.analyze_frame(img)
pg_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_PRIVATE_URL")
if pg_url:
    from src.database.pg_manager import PostgresDatabaseManager
    db_manager = PostgresDatabaseManager(pg_url)
else:
    try:
        from src.database.db_manager import DatabaseManager
        db_manager = DatabaseManager()
    except ImportError:
        from src.database.sqlite_manager import SQLiteDatabaseManager
        db_manager = SQLiteDatabaseManager()

WEB_DIST_DIR = os.path.join("mobile-app", "dist")

@app.get("/")
def root():
    dist_index = os.path.join(WEB_DIST_DIR, "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "Campus Facility AI Vision API is running",
        "docs_url": "/docs",
        "endpoints": ["/api/health", "/api/rooms", "/api/inspect", "/api/inspections"]
    }

@app.get("/api/health")
def health_check():
    """Cek kesehatan server, model AI, dan koneksi SQL Server"""
    db_status = db_manager.test_connection()
    return {
        "status": "healthy",
        "ai_model": "YOLOv8 Loaded",
        "database": db_status
    }

@app.get("/api/rooms")
def get_all_rooms():
    """Mengambil daftar semua ruangan kampus"""
    try:
        rooms = db_manager.get_rooms()
        return {"success": True, "data": rooms}
    except Exception as e:
        # Jika DB belum konek, berikan fallback mock rooms untuk kemudahan testing
        return {
            "success": False,
            "error": str(e),
            "fallback_rooms": [
                {"room_id": 1, "room_code": "LAB-IOT-1", "room_name": "Lab IOT", "building": "Gedung Teknik"},
                {"room_id": 2, "room_code": "R-101", "room_name": "Ruang Teori 101", "building": "Gedung A"}
            ]
        }

@app.post("/api/rooms")
def create_room_api(room: dict):
    """Menambahkan ruangan/aset baru ke database SQL Server"""
    try:
        room_id = db_manager.add_room(room)
        return {"success": True, "room_id": room_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.patch("/api/rooms/{room_code}/status")
def update_room_status_api(room_code: str, payload: dict):
    """Mengubah status ruangan (Aktif/Tutup) di Microsoft SQL Server"""
    try:
        new_status = payload.get("status", "Aktif")
        success = db_manager.update_room_status(room_code, new_status)
        return {"success": success}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _serve_spa_or_legacy(legacy_file: str):
    dist_index = os.path.join(WEB_DIST_DIR, "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    return FileResponse(legacy_file)

@app.get("/admin")
@app.get("/admin.html")
def get_admin_page():
    return _serve_spa_or_legacy("static/admin.html")

@app.get("/petugas")
@app.get("/petugas.html")
def get_petugas_page():
    return _serve_spa_or_legacy("static/petugas.html")

@app.get("/camera")
@app.get("/camera.html")
def get_camera_page():
    return _serve_spa_or_legacy("static/camera.html")

@app.get("/api/tasks")
def get_tasks_api():
    """Mengambil seluruh data Work Order (Tugas) dari database SQL Server"""
    try:
        tasks = db_manager.get_tasks()
        return {"success": True, "data": tasks}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.post("/api/tasks")
def create_task_api(task: dict):
    """Menyimpan tugas baru ke dalam database SQL Server"""
    try:
        task_id = db_manager.create_task(task)
        return {"success": True, "task_id": task_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/tasks/{task_id}/submit")
def submit_task_api(task_id: str, data: dict):
    """Menyimpan penyelesaian tugas dan hasil AI ke database SQL Server"""
    try:
        res = db_manager.update_task_completion(task_id, data)
        return {"success": True, "updated": res}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/reports")
def get_damage_reports_api():
    """Mengambil seluruh laporan kerusakan fasilitas dari database SQL Server"""
    try:
        reports = db_manager.get_damage_reports()
        return {"success": True, "data": reports}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.post("/api/reports")
def create_damage_report_api(report: dict):
    """Menyimpan laporan kerusakan baru dari Petugas ke database SQL Server"""
    try:
        report_id = db_manager.create_damage_report(report)
        return {"success": True, "report_id": report_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.patch("/api/reports/{report_id}/status")
def update_damage_report_status_api(report_id: str, payload: dict):
    """Mengubah status laporan kerusakan di database SQL Server"""
    try:
        new_status = payload.get("status", "Selesai")
        updated = db_manager.update_damage_report_status(report_id, new_status)
        return {"success": updated}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/inspect")
async def inspect_facility(
    room_id: int = Form(1),
    task_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Endpoint Utama:
    1. Menerima upload foto ruangan/fasilitas langsung ke memori (RAM).
    2. Menjalankan Computer Vision untuk mendeteksi kerusakan, noda, jejak kaki, percikan air, kaca kotor & volume sampah.
    3. Menghitung persentase kebersihan, kekotoran, dan kondisi fisik (0-15% Rusak Banget).
    4. Menyimpan data dan FOTO LANGSUNG KE DALAM SQL SERVER (BLOB VARBINARY).
    5. Menghubungkan hasil inspeksi langsung ke Work Order jika task_id dikirimkan.
    6. Mengembalikan hasil lengkap ke dashboard / HP.
    """
    import numpy as np
    import cv2

    if file.content_type and not (
        file.content_type.startswith("image/") or file.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=400, detail="File yang diunggah harus berupa gambar.")

    try:
        # 1. Baca bytes gambar langsung di memori tanpa simpan ke harddisk
        file_bytes = await file.read()
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Format file gambar tidak valid atau rusak.")

        # 2. Jalankan Computer Vision AI di threadpool + lock agar aman saat diakses banyak user
        ai_result = await run_in_threadpool(_run_ai_analysis_safe, img)

        # 3. Encode gambar teranotasi ke bytes JPEG
        annotated_display = ai_result["annotated_frame"]
        ret, annot_buf = cv2.imencode('.jpg', annotated_display, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        annot_bytes = annot_buf.tobytes() if ret else None

        # 4. Simpan ke Microsoft SQL Server (Gambar langsung masuk ke tabel Inspections)
        db_saved = False
        inspection_id = None
        db_error = None

        try:
            insp_notes = notes or f"Inspection | Status: {ai_result['status_detail']} | Kekotoran: {ai_result['dirtiness_percentage']}% ({ai_result['dirtiness_level']}) | Kondisi Fisik: {ai_result['physical_condition_percentage']}% ({ai_result['damage_level']})"
            inspection_id = db_manager.save_inspection(
                room_id=room_id,
                cleanliness_percentage=ai_result["cleanliness_percentage"],
                total_defects=ai_result["total_defects"],
                total_trash=ai_result["total_trash"] + ai_result["total_stains"] + ai_result["total_footprints"] + ai_result["total_water_splashes"],
                severity_level=ai_result["severity_level"],
                detections=ai_result["detections"],
                image_original_path=None,
                image_annotated_path=None,
                image_original_bytes=file_bytes,
                image_annotated_bytes=annot_bytes,
                notes=insp_notes
            )
            db_saved = True

            annotated_url = f"/api/inspections/{inspection_id}/image/annotated" if inspection_id else None
            if task_id:
                try:
                    db_manager.update_task_completion(task_id, {
                        "status": "Selesai" if ai_result["is_completed"] else "Diproses",
                        "catatan": insp_notes,
                        "foto_url": annotated_url,
                        "cleanliness_percentage": ai_result["cleanliness_percentage"],
                        "dirtiness_percentage": ai_result["dirtiness_percentage"],
                        "physical_condition_percentage": ai_result["physical_condition_percentage"],
                        "ai_status": f"{ai_result['status']} ({ai_result['cleanliness_percentage']}%)",
                        "inspection_id": inspection_id
                    })
                except Exception as task_err:
                    print(f"[Warning] Gagal update status task: {task_err}")
        except Exception as err:
            db_error = str(err)
            print(f"[Warning] Gagal menyimpan ke SQL Server: {db_error}")

        import base64
        annot_b64_uri = (
            f"data:image/jpeg;base64,{base64.b64encode(annot_bytes).decode('utf-8')}"
            if annot_bytes else None
        )

        return {
            "success": True,
            "inspection_id": inspection_id,
            "db_saved": db_saved,
            "db_message": "Saved directly into SQL Server (VARBINARY BLOB)" if db_saved else f"Database not ready: {db_error}",
            "room_id": room_id,
            "status": ai_result["status"],
            "status_detail": ai_result["status_detail"],
            "status_code": ai_result["status_code"],
            "is_completed": ai_result["is_completed"],
            "cleanliness_percentage": ai_result["cleanliness_percentage"],
            "dirtiness_percentage": ai_result["dirtiness_percentage"],
            "dirtiness_level": ai_result["dirtiness_level"],
            "dirtiness_description": ai_result["dirtiness_description"],
            "physical_condition_percentage": ai_result["physical_condition_percentage"],
            "damage_level": ai_result["damage_level"],
            "damage_description": ai_result["damage_description"],
            "trash_volume_status": ai_result["trash_volume_status"],
            "trash_volume_description": ai_result["trash_volume_description"],
            "total_defects": ai_result["total_defects"],
            "total_trash": ai_result["total_trash"],
            "total_stains": ai_result["total_stains"],
            "total_footprints": ai_result["total_footprints"],
            "total_water_splashes": ai_result["total_water_splashes"],
            "total_glass_stains": ai_result["total_glass_stains"],
            "severity_level": ai_result["severity_level"],
            "original_image_url": f"/api/inspections/{inspection_id}/image/original" if inspection_id else None,
            "annotated_image_url": f"/api/inspections/{inspection_id}/image/annotated" if inspection_id else annot_b64_uri,
            "detections": ai_result["detections"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saat analisis AI: {str(e)}")

@app.get("/api/inspections/{inspection_id}/image/{image_type}")
def get_inspection_image_from_sql(inspection_id: int, image_type: str = "annotated"):
    """Mengambil foto hasil inspeksi langsung dari binary (BLOB) di dalam tabel database"""
    img_bytes = db_manager.get_inspection_image(inspection_id=inspection_id, image_type=image_type)
    if not img_bytes:
        raise HTTPException(status_code=404, detail="Foto tidak ditemukan di dalam database.")
    return Response(
        content=img_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )

@app.post("/api/analyze-frame")
async def analyze_camera_frame(file: UploadFile = File(...)):
    """Menganalisis satu frame kamera secara real-time untuk live preview tanpa simpan ke database"""
    import numpy as np
    import cv2
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Format frame kamera tidak valid.")

        res = await run_in_threadpool(_run_ai_analysis_safe, frame)
        return {
            "success": True,
            "status": res["status"],
            "status_detail": res["status_detail"],
            "is_completed": res["is_completed"],
            "cleanliness_percentage": res["cleanliness_percentage"],
            "dirtiness_percentage": res["dirtiness_percentage"],
            "dirtiness_level": res["dirtiness_level"],
            "dirtiness_description": res["dirtiness_description"],
            "physical_condition_percentage": res["physical_condition_percentage"],
            "damage_level": res["damage_level"],
            "damage_description": res["damage_description"],
            "trash_volume_status": res["trash_volume_status"],
            "trash_volume_description": res["trash_volume_description"],
            "total_defects": res["total_defects"],
            "total_trash": res["total_trash"],
            "total_stains": res["total_stains"],
            "total_footprints": res["total_footprints"],
            "total_water_splashes": res["total_water_splashes"],
            "total_glass_stains": res["total_glass_stains"],
            "severity_level": res["severity_level"],
            "detections": res["detections"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses frame: {str(e)}")

@app.get("/api/laptop-stream")
def laptop_stream():
    """Streaming video langsung kamera laptop dengan tampilan HUD OpenCV bawaan"""
    import cv2
    def generate_frames():
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        try:
            while True:
                success, frame = cap.read()
                if not success:
                    break
                res = analyzer.analyze_frame(frame)
                annotated = res["annotated_frame"]
                ret, buffer = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if not ret:
                    continue
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        finally:
            cap.release()

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/inspections")
def get_recent_inspections(limit: int = 15):
    """Mengambil riwayat inspeksi untuk ditampilkan pada grafik/tabel dashboard"""
    try:
        inspections = db_manager.get_recent_inspections(limit=limit)
        return {"success": True, "data": inspections}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.post("/api/maintenance/cleanup-photos")
def cleanup_old_photos_api(days: int = 90):
    """Menghapus data binary foto yang lebih lama dari `days` hari (default 90 hari / 3 bulan)"""
    try:
        cleaned_count = db_manager.cleanup_old_photos(retention_days=days)
        return {
            "success": True,
            "retention_days": days,
            "cleaned_photos": cleaned_count,
            "message": f"Berhasil membersihkan {cleaned_count} data foto yang lebih lama dari {days} hari."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/officers")
def get_officers_api():
    """Mengambil seluruh daftar petugas lapangan dari database Microsoft SQL Server"""
    try:
        officers = db_manager.get_officers()
        return {"success": True, "data": officers}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.post("/api/officers")
def create_or_update_officer_api(payload: dict):
    """Mendaftarkan petugas baru oleh Admin (ID PTG-xxx otomatis dibuat) atau update profil petugas di SQL Server"""
    try:
        officer = db_manager.create_or_update_officer(payload)
        return {"success": True, "data": officer}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Melayani Production Web Bundle (Expo Web dist/) untuk Deployment Terpadu (1 URL HTTPS)
if os.path.isdir(os.path.join(WEB_DIST_DIR, "_expo")):
    app.mount("/_expo", StaticFiles(directory=os.path.join(WEB_DIST_DIR, "_expo")), name="expo_static")
if os.path.isdir(os.path.join(WEB_DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(WEB_DIST_DIR, "assets")), name="expo_assets")

@app.get("/{full_path:path}")
def serve_web_app(full_path: str):
    if full_path.startswith("api/") or full_path in ("docs", "openapi.json", "redoc"):
        raise HTTPException(status_code=404, detail="Endpoint tidak ditemukan")
    if os.path.isdir(WEB_DIST_DIR):
        direct_file = os.path.join(WEB_DIST_DIR, full_path)
        if full_path and os.path.isfile(direct_file):
            return FileResponse(direct_file)
        html_file = os.path.join(WEB_DIST_DIR, f"{full_path}.html")
        if full_path and os.path.isfile(html_file):
            return FileResponse(html_file)
        index_file = os.path.join(WEB_DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Halaman tidak ditemukan")

