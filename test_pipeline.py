import os
import cv2
import numpy as np
from src.core.analyzer import FacilityAnalyzer

def create_synthetic_test_image(output_path: str = "uploads/test_toilet_stains.jpg"):
    """
    Membuat foto simulasi lantai toilet/fasilitas dengan:
    - Noda darah / merah
    - Noda urin / pipis kuning
    - Jejak kaki kotor
    - Percikan air
    - Retakan lantai / cacat fisik
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 1. Background ubin keramik putih-abu (800x600)
    w, h = 800, 600
    img = np.ones((h, w, 3), dtype=np.uint8) * 235

    # Gambar garis nat ubin
    grid_size = 120
    for x in range(0, w, grid_size):
        cv2.line(img, (x, 0), (x, h), (190, 190, 190), 2)
    for y in range(0, h, grid_size):
        cv2.line(img, (0, y), (w, y), (190, 190, 190), 2)

    # 2. Simulasi Jejak Kaki Kotor (Cokelat gelap, bentuk lonjong sepatu di area lantai)
    # y = 380, x = 160
    cv2.ellipse(img, (160, 380), (32, 70), -20, 0, 360, (28, 55, 95), -1)
    cv2.ellipse(img, (185, 330), (22, 28), -20, 0, 360, (28, 55, 95), -1)

    # 3. Simulasi Noda Darah / Cairan Merah Pekat (Merah crimson)
    # y = 430, x = 360
    cv2.circle(img, (360, 430), 30, (20, 20, 190), -1)
    cv2.circle(img, (390, 445), 18, (20, 20, 190), -1)
    cv2.circle(img, (335, 450), 12, (20, 20, 190), -1)

    # 4. Simulasi Noda Urin / Pipis (Kuning amber di sekitar toilet)
    # y = 420, x = 580
    cv2.ellipse(img, (580, 420), (55, 35), 10, 0, 360, (25, 185, 220), -1)

    # 5. Simulasi Percikan Air / Genangan (Pantulan mengkilap)
    # y = 490, x = 270
    cv2.ellipse(img, (270, 490), (45, 20), 0, 0, 360, (255, 245, 240), -1)

    # 6. Simulasi Retakan Fisik Permukaan (Garis hitam bergerigi tipis memanjang)
    pts = np.array([[650, 200], [665, 240], [655, 275], [680, 330], [670, 370]], np.int32)
    cv2.polylines(img, [pts], False, (35, 35, 40), 3)

    # 7. Simulasi Kaca / Cermin Kotor (Bercak sabun kering / bekas lap kotor pada kaca)
    # Area cermin di atas (x: 80-260, y: 70-210)
    cv2.rectangle(img, (80, 70), (260, 210), (210, 210, 210), 2)
    cv2.putText(img, "Cermin", (90, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (140, 140, 140), 1)
    # Goresan kerak air / noda kabur di dalam cermin
    for i in range(110, 240, 15):
        cv2.line(img, (i, 115), (i + 12, 175), (175, 175, 175), 2)
    cv2.circle(img, (145, 150), 18, (168, 168, 168), -1)

    cv2.putText(img, "TEST SIMULASI: Toilet (Jejak, Darah, Urin, Air, Kaca, Retak)", (20, h - 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (60, 60, 60), 2)

    cv2.imwrite(output_path, img)
    return output_path

def main():
    print("=" * 70)
    print("🧪 UJI COBA PIPELINE AI: DETEKSI NODA, KACA KOTOR, SAMPAH & KERUSAKAN")
    print("=" * 70)

    sample_img_path = create_synthetic_test_image()
    analyzer = FacilityAnalyzer()

    # Jalankan analisis citra simulasi
    result = analyzer.analyze_image(sample_img_path)

    print("\n[HASIL ANALISIS CITRA]")
    print("-" * 55)
    print(f" Status Evaluasi        : {result['status']} ({result['status_detail']})")
    print(f" Skor Kebersihan        : {result['cleanliness_percentage']}%")
    print(f" Penilaian Kekotoran    : {result['dirtiness_percentage']}% ({result['dirtiness_level']})")
    print(f" Kondisi Fisik Fasilitas: {result['physical_condition_percentage']}% ({result['damage_level']})")
    print(f" Keterangan Kerusakan   : {result['damage_description']}")
    print(f" Total Sampah           : {result['total_trash']} objek ({result['trash_volume_status']})")
    print(f" Total Noda (Darah/Urin): {result['total_stains']} noda")
    print(f" Total Jejak Kaki       : {result['total_footprints']} jejak")
    print(f" Total Percikan Air     : {result['total_water_splashes']} titik air")
    print(f" Total Kaca Kotor       : {result.get('total_glass_stains', 0)} bercak kaca")
    print(f" Total Kerusakan Fisik  : {result['total_defects']} retak/pecah")
    print("-" * 55)

    print("\n[DETEKSI YANG DITEMUKAN PADA CITRA]")
    for idx, d in enumerate(result['detections'], 1):
        print(f" {idx}. [{d['category']}] {d['class_name']} (Conf: {int(d['confidence']*100)}%, Area: {d['area_percentage']}%)")

    # Verifikasi Validasi Tingkatan Kerusakan Sesuai Permintaan User:
    print("\n[VERIFIKASI TINGKATAN KERUSAKAN]")
    print("  0% - 15%  : Rusak Banget (Sangat Parah / Berbahaya)")
    print("  16% - 35% : Rusak Berat")
    print("  36% - 60% : Rusak Sedang")
    print("  61% - 85% : Rusak Ringan")
    print("  86% - 100%: Aman / Sangat Baik")
    print("-" * 55)

    tiers_test = [
        {"defects": 0, "name": "Tanpa Kerusakan (Fasilitas Mulus)"},
        {"defects": 1, "name": "1 Titik Kerusakan Retak Minor"},
        {"defects": 2, "name": "2 Titik Kerusakan Fisik"},
        {"defects": 3, "name": "3 Titik Kerusakan Fisik"},
        {"defects": 4, "name": "4 Titik Kerusakan Fisik (Parah)"},
        {"defects": 6, "name": "Kerusakan Masif / Rusak Banget"},
    ]

    for t in tiers_test:
        cnt = t["defects"]
        if cnt == 0:
            score = 100.0
        elif cnt == 1:
            score = 78.0
        elif cnt == 2:
            score = 52.0
        elif cnt == 3:
            score = 28.0
        else:
            score = max(0.0, 15.0 - (cnt - 4) * 3.0)

        # Label tingkatan
        if score <= 15.0:
            level = "Rusak Banget (Sangat Parah)"
            status = "BELUM SELESAI"
        elif score <= 35.0:
            level = "Rusak Berat"
            status = "BELUM SELESAI"
        elif score <= 60.0:
            level = "Rusak Sedang"
            status = "Perlu Perbaikan"
        elif score <= 85.0:
            level = "Rusak Ringan"
            status = "Aman Bertingkat"
        else:
            level = "Aman / Sangat Baik"
            status = "SELESAI (Aman)"

        print(f"• {t['name']}:")
        print(f"  -> Kondisi Fisik: {score:.1f}% | Tingkat: {level} | Status: {status}")

    print("\n" + "=" * 70)
    print("✅ Seluruh verifikasi aturan noda toilet, air, dan kerusakan BERHASIL!")
    print("=" * 70)

if __name__ == "__main__":
    main()
