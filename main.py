import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import argparse

def main():
    """
    Campus Facility AI Vision - Main Entrypoint
    Secara default langsung membuka Kamera & AI Analyzer (tanpa frontend / tanpa web dashboard).
    Gunakan --web jika ingin menjalankan REST API server.
    """
    parser = argparse.ArgumentParser(
        description="Campus Facility AI Vision - Deteksi Kamera & Analisis Fasilitas"
    )
    parser.add_argument("--web", action="store_true", help="Jalankan server REST API alih-alih membuka kamera langsung")
    parser.add_argument("--cam", type=int, default=0, help="Device index webcam (default: 0)")
    parser.add_argument("--room", type=int, default=1, help="Room ID di SQL Server (default: 1)")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold YOLO (default: 0.25)")
    parser.add_argument("--no-flip", dest="flip", action="store_false", default=True, help="Jangan balik frame horizontal (biarkan raw camera)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host server (default: 0.0.0.0 agar bisa diakses HP)")
    parser.add_argument("--port", type=int, default=8000, help="Port server (default: 8000)")
    args, unknown = parser.parse_known_args()

    if args.web:
        import uvicorn
        import socket
        
        # Cari IP lokal laptop
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        print("=" * 60)
        print("[WEB SERVER] MENJALANKAN SERVER API & KAMERA WEB")
        print(f"-> Akses dari Laptop : http://localhost:{args.port}")
        print(f"-> Akses dari HP     : http://{local_ip}:{args.port}")
        print("   (Pastikan Laptop dan HP terhubung ke Wi-Fi / Hotspot yang sama)")
        print("=" * 60)
        uvicorn.run("src.api.main:app", host=args.host, port=args.port, reload=False)
    else:
        # Default: Langsung buka kamera OpenCV dengan pendeteksi AI
        from run_camera import main as run_camera_main
        cmd_args = [sys.argv[0], "--cam", str(args.cam), "--room", str(args.room), "--conf", str(args.conf)]
        if not args.flip:
            cmd_args.append("--no-flip")
        sys.argv = cmd_args
        run_camera_main()

if __name__ == "__main__":
    main()
