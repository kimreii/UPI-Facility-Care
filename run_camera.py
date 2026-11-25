import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import cv2
import os
import time
import argparse
from datetime import datetime
from src.core.analyzer import FacilityAnalyzer
from src.database.db_manager import DatabaseManager

def main():
    parser = argparse.ArgumentParser(description="Live Camera Campus Facility AI Vision & Inspection")
    parser.add_argument("--cam", type=int, default=0, help="Webcam device index (default: 0)")
    parser.add_argument("--room", type=int, default=1, help="Default Room ID in SQL Server (default: 1)")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold (default: 0.25)")
    parser.add_argument("--no-flip", dest="flip", action="store_false", default=True, help="Jangan balik frame horizontal (biarkan raw camera)")
    args = parser.parse_args()

    print("=" * 60)
    print("[AI VISION] LIVE CAMERA - CAMPUS FACILITY AI SYSTEM")
    print("=" * 60)

    # 1. Inisialisasi Database & AI Analyzer
    print("[1/2] Menghubungkan ke AI Model dan Database...")
    analyzer = FacilityAnalyzer(model_path="models/yolov8n.pt")
    db = DatabaseManager()

    # Ambil info ruangan
    rooms = []
    current_room_id = args.room
    current_room_name = f"Room #{current_room_id}"
    try:
        rooms = db.get_rooms()
        matched = [r for r in rooms if r["room_id"] == current_room_id]
        if matched:
            current_room_name = f"{matched[0]['room_code']} - {matched[0]['room_name']}"
    except Exception as e:
        print(f"[Warning] Gagal mengambil data ruangan dari DB: {e}")

    # 2. Buka Webcam
    print(f"[2/2] Membuka kamera (Device Index: {args.cam})...")
    cap = cv2.VideoCapture(args.cam)

    if not cap.isOpened():
        print(f"[ERROR] Tidak dapat membuka kamera dengan indeks {args.cam}!")
        print("Pastikan kamera/webcam terpasang, atau coba ganti parameter --cam 1")
        return

    # Atur resolusi kamera (HD jika didukung)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("\n" + "=" * 60)
    print("[OK] KAMERA AKTIF!")
    print(f"Ruangan Terpilih : [{current_room_id}] {current_room_name}")
    print("KONTROL KEYBOARD:")
    print("  [M]     : Toggle Balik Kamera (Mirror / Non-Mirror)")
    print("  [SPASI] : Ambil Foto Snapshot & Simpan Hasil ke Database MSSQL")
    print("  [Q/ESC] : Tutup Kamera & Keluar")
    print("=" * 60 + "\n")

    os.makedirs("uploads", exist_ok=True)
    prev_time = time.time()
    notification_msg = ""
    notification_timer = 0
    flip_horizontal = args.flip

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[Warning] Gagal membaca frame dari kamera.")
            break

        # Balik frame secara horizontal agar TIDAK mirror (atau sesuai toggle user)
        if flip_horizontal:
            frame = cv2.flip(frame, 1)

        # Hitung FPS
        curr_time = time.time()
        fps = 1.0 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
        prev_time = curr_time

        # Jalankan Analisis AI pada frame saat ini
        result = analyzer.analyze_frame(frame, conf_threshold=args.conf)
        annotated_display = result["annotated_frame"]

        # Tambahkan Overlay Status Bar di Bawah
        h, w = annotated_display.shape[:2]
        bar_h = 40
        overlay = annotated_display.copy()
        cv2.rectangle(overlay, (0, h - bar_h), (w, h), (20, 20, 25), -1)
        cv2.addWeighted(overlay, 0.8, annotated_display, 0.2, 0, annotated_display)

        mirror_status = "Non-Mirror (Normal)" if flip_horizontal else "Raw Camera"
        bottom_info = f"Lokasi: {current_room_name} | FPS: {fps:.1f} | [M]: Mirror On/Off ({mirror_status}) | [SPASI]: Snapshot | [Q]: Keluar"
        cv2.putText(annotated_display, bottom_info, (15, h - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (220, 220, 220), 1, cv2.LINE_AA)

        # Tampilkan Notifikasi jika baru saja snapshot / ubah mode
        if notification_timer > 0:
            notification_timer -= 1
            cv2.rectangle(annotated_display, (w // 2 - 270, 70), (w // 2 + 270, 115), (0, 160, 0), -1)
            cv2.putText(annotated_display, notification_msg, (w // 2 - 250, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

        # Tampilkan di Window OpenCV
        cv2.imshow("Campus Facility AI Vision - Live Camera", annotated_display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27: # 'q' atau ESC
            break
        elif key == ord('m') or key == ord('M'): # Tekan M untuk toggle mirror
            flip_horizontal = not flip_horizontal
            notification_msg = f"Mode Kamera: {'Non-Mirror (Normal)' if flip_horizontal else 'Raw Camera (Mirror)'}"
            notification_timer = 40
            print(f"[INFO] Tampilan diubah -> {'Non-Mirror (Normal / Tidak Terbalik)' if flip_horizontal else 'Raw Camera (Mirror)'}")
        elif key == 32: # SPASI (Snapshot & Simpan Langsung ke SQL Server)
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

            # Encode frame & annotated display ke JPEG bytes di memori (Tanpa file harddisk)
            _, orig_buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            _, annot_buf = cv2.imencode('.jpg', annotated_display, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            orig_bytes = orig_buf.tobytes()
            annot_bytes = annot_buf.tobytes()

            # Simpan langsung ke Database MSSQL sebagai VARBINARY (BLOB)
            db_saved = False
            try:
                total_dirty_items = result["total_trash"] + result["total_stains"] + result["total_footprints"] + result["total_water_splashes"]
                insp_id = db.save_inspection(
                    room_id=current_room_id,
                    cleanliness_percentage=result["cleanliness_percentage"],
                    total_defects=result["total_defects"],
                    total_trash=total_dirty_items,
                    severity_level=result["severity_level"],
                    detections=result["detections"],
                    image_original_path=None,
                    image_annotated_path=None,
                    image_original_bytes=orig_bytes,
                    image_annotated_bytes=annot_bytes,
                    notes=f"Live Camera Snapshot ({timestamp_str}) | Status: {result['status_detail']} | Kekotoran: {result['dirtiness_percentage']}% ({result['dirtiness_level']}) | Fisik: {result['physical_condition_percentage']}% ({result['damage_level']})"
                )
                db_saved = True
                notification_msg = f"[OK] Foto Masuk SQL Server (ID #{insp_id})!"
                print(f"[SNAPSHOT] Foto tersimpan di SQL (#{insp_id}) | Status: {result['status']} | Kebersihan: {result['cleanliness_percentage']}% | Kekotoran: {result['dirtiness_percentage']}% ({result['dirtiness_level']}) | Fisik: {result['physical_condition_percentage']}% ({result['damage_level']}) | Sampah/Noda: {total_dirty_items} | Rusak: {result['total_defects']}")
            except Exception as err:
                notification_msg = "[ERROR] Gagal Simpan ke SQL"
                print(f"[Warning] Gagal menyimpan ke DB: {err}")

            notification_timer = 45 # Tampilkan ~1.5 detik

    cap.release()
    cv2.destroyAllWindows()
    print("\n[INFO] Kamera ditutup.")

if __name__ == "__main__":
    main()
