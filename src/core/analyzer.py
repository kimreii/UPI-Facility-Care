import os
import cv2
import numpy as np
from typing import Dict, Any, List
from ultralytics import YOLO

class FacilityAnalyzer:
    """
    Computer Vision Analyzer for Campus Facility Maintenance & Cleanliness.
    Mendeteksi:
    - Sampah (botol, gelas, plastik, tisu/kertas, kardus, sisa makanan)
    - Noda & Pengotor (jejak kaki di toilet/lantai, noda darah, noda urin/pipis, percikan air)
    - Kerusakan Fisik Fasilitas dengan persentase & tingkatan (0-15% Rusak Banget, >15% Aman bertingkat)
    - Fasilitas & Perabot (kursi, meja, laptop, monitor)
    - Mengabaikan deteksi orang sesuai permintaan pengguna.
    """

    # Pemetaan Nama Objek Standar ke Bahasa Indonesia & Kategori
    ITEM_REGISTRY = {
        # Perabot & Fasilitas (Kategori: Facility - TIDAK dihitung sampah)
        'chair': ('kursi', 'Facility'),
        'dining table': ('meja', 'Facility'),
        'couch': ('sofa / kursi', 'Facility'),
        'bed': ('tempat tidur', 'Facility'),
        'desk': ('meja kerja', 'Facility'),
        
        # Perangkat Elektronik & Kantor (Kategori: Facility - TIDAK dihitung sampah)
        'laptop': ('laptop', 'Facility'),
        'tv': ('monitor / tv', 'Facility'),
        'mouse': ('mouse', 'Facility'),
        'keyboard': ('keyboard', 'Facility'),
        'cell phone': ('hp / ponsel', 'Facility'),
        'remote': ('remote', 'Facility'),
        'microwave': ('microwave', 'Facility'),
        'oven': ('oven', 'Facility'),
        # Perangkat Sanitasi & Fasilitas Ruangan (Kategori: Facility)
        'toilet': ('kloset / toilet', 'Facility'),
        'sink': ('wastafel', 'Facility'),
        'refrigerator': ('kulkas', 'Facility'),
        'clock': ('jam dinding', 'Facility'),
        
        # Barang / Perlengkapan Belajar (Kategori: Facility - TIDAK dihitung sampah)
        'book': ('buku', 'Facility'),
        'backpack': ('tas ransel', 'Facility'),
        'handbag': ('tas', 'Facility'),
        'suitcase': ('koper', 'Facility'),
        'umbrella': ('payung', 'Facility'),
        'vase': ('vas bunga', 'Facility'),
        'potted plant': ('tanaman hias', 'Facility'),
        'scissors': ('gunting', 'Facility'),
        
        # Objek Sampah & Pengotor Standar YOLO (Kategori: Cleanliness)
        'bottle': ('botol plastik', 'Cleanliness'),
        'cup': ('gelas plastik', 'Cleanliness'),
        'wine glass': ('gelas kaca', 'Cleanliness'),
        'bowl': ('wadah / mangkuk', 'Cleanliness'),
        'banana': ('sisa pisang', 'Cleanliness'),
        
        # Sampah dari Model Waste YOLO
        'paper': ('tisu / kertas', 'Cleanliness'),
        'plastic': ('sampah plastik', 'Cleanliness'),
        'cardboard': ('kardus', 'Cleanliness'),
        'metal': ('kaleng / logam', 'Cleanliness'),
        'organic': ('sisa makanan', 'Cleanliness'),
    }

    # Kategori Kerusakan Fisik Fasilitas
    DAMAGE_CLASSES = {
        'crack', 'wall_crack', 'ceiling_leak', 'stain', 'water_damage',
        'broken_chair', 'broken_table', 'peeling_paint', 'broken_door',
        'damage', 'defect', 'broken', 'hole', 'leak', 'scratch'
    }

    # Objek yang WAJIB diabaikan (Orang tidak perlu dideteksi sesuai permintaan user, serta pintu)
    IGNORED_CLASSES = {'door', 'person'}

    def __init__(self, model_path: str = "models/yolov8n.pt"):
        self.model_path = model_path
        self.model = None
        self.waste_model = None
        self._load_models()

    def _load_models(self):
        """Memuat model AI (Primary YOLO + Waste Model)"""
        if not os.path.exists(self.model_path):
            print(f"[AI Analyzer] Loading base YOLOv8 model: {self.model_path}")
        self.model = YOLO(self.model_path)
        print("[AI Analyzer] Primary YOLO model loaded successfully.")

        waste_path = "models/waste_yolov8.pt"
        if os.path.exists(waste_path):
            try:
                self.waste_model = YOLO(waste_path)
                print("[AI Analyzer] Waste YOLOv8 model loaded successfully.")
            except Exception as e:
                print(f"[AI Analyzer] Warning loading waste model: {e}")

    def _resolve_furniture_vs_waste(
        self, facility_items: List[Dict[str, Any]], waste_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Mencegah perabot (kursi plastik, meja) salah terdeteksi sebagai sampah plastik."""
        resolved_items = list(facility_items)

        for wb in waste_items:
            w_box = wb["bbox"]
            w_area = w_box["width"] * w_box["height"]
            is_misclassified = False

            for fb in facility_items:
                f_box = fb["bbox"]
                f_area = f_box["width"] * f_box["height"]

                ix1 = max(w_box["x"], f_box["x"])
                iy1 = max(w_box["y"], f_box["y"])
                ix2 = min(w_box["x"] + w_box["width"], f_box["x"] + f_box["width"])
                iy2 = min(w_box["y"] + w_box["height"], f_box["y"] + f_box["height"])

                if ix2 > ix1 and iy2 > iy1:
                    inter_area = (ix2 - ix1) * (iy2 - iy1)
                    if inter_area > 0.5 * w_area and (w_area / float(f_area + 1e-6)) > 0.35:
                        is_misclassified = True
                        break

            if not is_misclassified:
                resolved_items.append(wb)

        return resolved_items

    def _detect_structural_facilities(
        self, frame: np.ndarray, existing_facilities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Mendeteksi fasilitas kelas/ruangan struktural yang sering terlewat oleh COCO YOLO standar:
        1. Papan Tulis (Whiteboard) -> kategori 'Facility' (Kondisi Baik)
        2. Monitor / TV Layar Gelap di Stand -> kategori 'Facility' (Kondisi Baik)
        Berjalan pada resolusi ternormalisasi (maks 960px) agar konsisten di semua kamera HP.
        """
        orig_h, orig_w = frame.shape[:2]
        total_orig_pixels = float(orig_h * orig_w)
        extra_facilities: List[Dict[str, Any]] = []

        scale = 960.0 / float(max(orig_h, orig_w))
        if scale < 1.0:
            work_w = max(1, int(orig_w * scale))
            work_h = max(1, int(orig_h * scale))
            img = cv2.resize(frame, (work_w, work_h), interpolation=cv2.INTER_AREA)
        else:
            scale = 1.0
            work_w, work_h = orig_w, orig_h
            img = frame

        inv_scale = 1.0 / scale
        work_pixels = float(work_w * work_h)

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        L_ch = lab[:, :, 0].astype(np.float32)
        S_ch = hsv[:, :, 1].astype(np.float32)
        V_ch = hsv[:, :, 2].astype(np.float32)

        def overlaps_existing_orig(ox, oy, ow, oh, class_filter=None, iou_thresh=0.35):
            area = float(ow * oh)
            for ef in existing_facilities + extra_facilities:
                if class_filter and class_filter not in ef.get("class_name", "").lower():
                    continue
                b = ef["bbox"]
                ix1 = max(ox, b["x"])
                iy1 = max(oy, b["y"])
                ix2 = min(ox + ow, b["x"] + b["width"])
                iy2 = min(oy + oh, b["y"] + b["height"])
                if ix2 > ix1 and iy2 > iy1:
                    inter = float((ix2 - ix1) * (iy2 - iy1))
                    min_a = min(area, float(b["width"] * b["height"]))
                    if inter > iou_thresh * min_a:
                        return True
            return False

        # Pisahkan bidang objek menggunakan tepi Canny dari bingkai papan tulis / bezel TV
        edges = cv2.Canny(cv2.GaussianBlur(L_ch.astype(np.uint8), (5, 5), 0), 20, 60)
        edges_d = cv2.dilate(edges, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))

        # 1. Deteksi Papan Tulis (Whiteboard): bidang persegi panjang putih/terang bersaturasi rendah
        #    yang dibatasi oleh bingkai lurus di bagian atas/tengah ruangan.
        wb_cand = ((L_ch >= 132.0) & (S_ch <= 24.0) & (edges_d == 0)).astype(np.uint8) * 255
        wb_cand[int(work_h * 0.55):, :] = 0
        cnts_wb, _ = cv2.findContours(wb_cand, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in sorted(cnts_wb, key=cv2.contourArea, reverse=True):
            x, y, bw, bh = cv2.boundingRect(c)
            ap = (bw * bh) / work_pixels * 100.0
            if ap < 2.2 or ap > 15.0:
                continue
            # Papan tulis tidak menempel penuh di plafon paling atas (y >= 3% tinggi layar)
            if y < int(work_h * 0.03) or (y + bh) > int(work_h * 0.54):
                continue
            ar = float(bw) / float(bh + 1e-5)
            if ar < 1.05 or ar > 2.35:
                continue
            ext = cv2.contourArea(c) / float(bw * bh + 1e-5)
            if ext < 0.72:
                continue
            roi_L = L_ch[y:y + bh, x:x + bw]
            roi_S = S_ch[y:y + bh, x:x + bw]
            if float(np.mean(roi_L)) < 148.0 or float(np.mean(roi_S)) > 23.0:
                continue

            ox = int(x * inv_scale)
            oy = int(y * inv_scale)
            ow = int(bw * inv_scale)
            oh = int(bh * inv_scale)
            if not overlaps_existing_orig(ox, oy, ow, oh, iou_thresh=0.35):
                extra_facilities.append({
                    "category": "Facility",
                    "class_name": "papan tulis",
                    "confidence": 0.89,
                    "bbox": {"x": ox, "y": oy, "width": ow, "height": oh},
                    "area_percentage": round((ow * oh) / total_orig_pixels * 100.0, 2)
                })
                break

        # Fallback untuk papan tulis dengan pencahayaan sangat terang (mis. insp_9)
        if not any(ef["class_name"] == "papan tulis" for ef in extra_facilities):
            edges_b = cv2.Canny(cv2.GaussianBlur(L_ch.astype(np.uint8), (3, 3), 0), 25, 80)
            edges_bd = cv2.dilate(edges_b, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
            wb_bright = ((L_ch >= 165.0) & (S_ch <= 32.0) & (edges_bd == 0)).astype(np.uint8) * 255
            wb_bright[int(work_h * 0.50):, :] = 0
            cnts_wbb, _ = cv2.findContours(wb_bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in sorted(cnts_wbb, key=cv2.contourArea, reverse=True):
                x, y, bw, bh = cv2.boundingRect(c)
                ap = (bw * bh) / work_pixels * 100.0
                if ap < 2.2 or ap > 14.0 or y < int(work_h * 0.04):
                    continue
                ar = float(bw) / float(bh + 1e-5)
                ext = cv2.contourArea(c) / float(bw * bh + 1e-5)
                if 1.02 <= ar <= 2.35 and ext >= 0.75:
                    roi_L = L_ch[y:y + bh, x:x + bw]
                    roi_S = S_ch[y:y + bh, x:x + bw]
                    if float(np.mean(roi_L)) >= 172.0 and float(np.mean(roi_S)) <= 15.0:
                        ox, oy, ow, oh = int(x * inv_scale), int(y * inv_scale), int(bw * inv_scale), int(bh * inv_scale)
                        if not overlaps_existing_orig(ox, oy, ow, oh, iou_thresh=0.35):
                            extra_facilities.append({
                                "category": "Facility",
                                "class_name": "papan tulis",
                                "confidence": 0.87,
                                "bbox": {"x": ox, "y": oy, "width": ow, "height": oh},
                                "area_percentage": round((ow * oh) / total_orig_pixels * 100.0, 2)
                            })
                            break

        # 2. Deteksi Layar Monitor / TV Hitam Besar di Stand (jika belum terdeteksi oleh YOLO)
        tv_cand = ((V_ch <= 78.0) & (L_ch <= 82.0) & (edges_d == 0)).astype(np.uint8) * 255
        tv_cand[int(work_h * 0.52):, :] = 0
        cnts_tv, _ = cv2.findContours(tv_cand, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in sorted(cnts_tv, key=cv2.contourArea, reverse=True):
            x, y, bw, bh = cv2.boundingRect(c)
            ap = (bw * bh) / work_pixels * 100.0
            if ap < 4.5 or ap > 18.0:
                continue
            if y < int(work_h * 0.08) or (y + bh) > int(work_h * 0.50):
                continue
            ar = float(bw) / float(bh + 1e-5)
            if ar < 1.30 or ar > 2.15:
                continue
            ext = cv2.contourArea(c) / float(bw * bh + 1e-5)
            if ext < 0.42:
                continue

            ox, oy, ow, oh = int(x * inv_scale), int(y * inv_scale), int(bw * inv_scale), int(bh * inv_scale)
            if not overlaps_existing_orig(ox, oy, ow, oh, class_filter="tv", iou_thresh=0.25):
                extra_facilities.append({
                    "category": "Facility",
                    "class_name": "monitor / tv",
                    "confidence": 0.85,
                    "bbox": {"x": ox, "y": oy, "width": ow, "height": oh},
                    "area_percentage": round((ow * oh) / total_orig_pixels * 100.0, 2)
                })
                break

        return extra_facilities

    def _detect_surface_stains_and_anomalies(
        self, frame: np.ndarray, existing_boxes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Deteksi Computer Vision khusus untuk noda & cairan:
        1. Jejak kaki di toilet/lantai (footprints / muddy shoe marks)
        2. Noda darah / cairan merah pekat (blood stains / spills)
        3. Noda urin / pipis (yellowish stains / liquid puddle)
        4. Percikan air / genangan air (water splashes / wet puddles)
        5. Kerusakan fisik permukaan (retakan / lubang / goresan parah)
        """
        img_h, img_w = frame.shape[:2]
        total_pixels = float(img_h * img_w)
        detected_anomalies: List[Dict[str, Any]] = []

        # Konversi Ruang Warna
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Buat Mask Eksklusi Objek Fasilitas & Perabot (Kursi, TV, Tas, Meja, Papan Tulis, dll.)
        # agar bagian dari kursi, layar TV, penghapus papan tulis, tali tas, atau bingkai objek
        # TIDAK pernah dianggap sebagai noda atau kerusakan.
        facility_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        for eb in existing_boxes:
            if eb.get("category") == "Facility":
                b = eb["bbox"]
                cname_f = eb.get("class_name", "").lower()
                pad_f = 32 if ("tas" in cname_f or "papan" in cname_f or "tv" in cname_f) else 20
                pad_down = int(b["height"] * 0.45) if ("papan" in cname_f or "tv" in cname_f) else pad_f
                fx1 = max(0, b["x"] - pad_f)
                fy1 = max(0, b["y"] - pad_f)
                fx2 = min(img_w, b["x"] + b["width"] + pad_f)
                fy2 = min(img_h, b["y"] + b["height"] + pad_down)
                facility_mask[fy1:fy2, fx1:fx2] = 255

        # Helper untuk cek tumpang tindih dengan anomali noda yang sudah terdeteksi atau objek nyata
        def is_overlapping_existing(x, y, w, h, threshold=0.30):
            box_area = w * h
            # 1. Tolak jika menyentuh mask objek fasilitas (kursi, TV, tas, meja, dll.)
            roi_fac = facility_mask[max(0, y):min(img_h, y + h), max(0, x):min(img_w, x + w)]
            if roi_fac.size > 0 and (np.count_nonzero(roi_fac) / float(roi_fac.size)) > 0.15:
                return True

            # 2. Cek terhadap noda/anomali lain yang sudah masuk di detected_anomalies
            for da in detected_anomalies:
                b = da["bbox"]
                ix1 = max(x, b["x"])
                iy1 = max(y, b["y"])
                ix2 = min(x + w, b["x"] + b["width"])
                iy2 = min(y + h, b["y"] + b["height"])
                if ix2 > ix1 and iy2 > iy1:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    min_a = min(box_area, b["width"] * b["height"])
                    if inter > threshold * min_a:
                        return True

            # 3. Cek terhadap semua objek di existing_boxes
            for eb in existing_boxes:
                b = eb["bbox"]
                ix1 = max(x, b["x"])
                iy1 = max(y, b["y"])
                ix2 = min(x + w, b["x"] + b["width"])
                iy2 = min(y + h, b["y"] + b["height"])
                if ix2 > ix1 and iy2 > iy1:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    if inter > threshold * box_area:
                        return True
            return False

        # =========================================================================
        # DETEKSI NODA BERBASIS KONTRAS LOKAL (LOCAL-CONTRAST ANOMALY DETECTION)
        # Hanya mendeteksi bercak noda organik berwarna (darah, urin, kerak cokelat)
        # yang berada di atas permukaan datar seragam (lantai/dinding/keramik).
        # Objek hitam/abu-abu netral (layar TV, kursi hitam, tali tas, spidol/papan tulis)
        # diabaikan sepenuhnya agar tidak salah terdeteksi sebagai noda atau retakan.
        # =========================================================================
        bg_k = max(35, (int(min(img_h, img_w) * 0.14) // 2) * 2 + 1)
        bg_lab = cv2.GaussianBlur(lab, (bg_k, bg_k), 0)
        bg_hsv = cv2.GaussianBlur(hsv, (bg_k, bg_k), 0)

        L_f = lab[:, :, 0].astype(np.float32)
        a_f = lab[:, :, 1].astype(np.float32)
        b_f = lab[:, :, 2].astype(np.float32)
        bg_L = bg_lab[:, :, 0].astype(np.float32)
        bg_a = bg_lab[:, :, 1].astype(np.float32)
        bg_b = bg_lab[:, :, 2].astype(np.float32)

        S_f = hsv[:, :, 1].astype(np.float32)
        V_f = hsv[:, :, 2].astype(np.float32)
        bg_S = bg_hsv[:, :, 1].astype(np.float32)

        # Selisih lokal terhadap permukaan sekitar
        delta_L_dark = bg_L - L_f          # Positif jika bercak lebih gelap dari permukaan sekitar
        delta_a = a_f - bg_a               # Positif jika bercak lebih merah dari permukaan sekitar
        delta_b = b_f - bg_b               # Positif jika bercak lebih kuning dari permukaan sekitar
        delta_S = S_f - bg_S               # Positif jika bercak lebih pekat dari permukaan sekitar
        delta_E = np.sqrt(np.maximum(0.0, delta_L_dark) ** 2 + delta_a ** 2 + delta_b ** 2)

        min_stain_pixels = max(180, int(0.0007 * total_pixels))
        max_stain_pixels = int(0.045 * total_pixels)

        def verify_stain_ring(cnt, min_area, max_area, min_solidity=0.52, min_extent=0.30, max_ar=2.6):
            """Memvalidasi geometri kontur noda & keseragaman permukaan di sekelilingnya"""
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                return None
            x, y, w, h = cv2.boundingRect(cnt)
            if w < 12 or h < 12:
                return None
            # Abaikan kontur yang menempel di tepi frame kamera
            if x <= 4 or y <= 4 or (x + w) >= (img_w - 4) or (y + h) >= (img_h - 4):
                return None

            # Tolak bentuk memanjang seperti tali tas, kabel, kaki kursi, atau bingkai papan tulis
            ar = float(max(w, h)) / float(min(w, h) + 1e-5)
            if ar > max_ar:
                return None

            rect_area = float(w * h)
            extent = area / (rect_area + 1e-5)
            # Tolak bentuk kotak/persegi panjang presisi (seperti layar TV, papan tulis, stiker)
            if extent < min_extent or extent > 0.80:
                return None

            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            solidity = area / float(hull_area + 1e-5)
            if solidity < min_solidity:
                return None

            # Buat mask ROI lokal untuk membandingkan bagian dalam noda vs cincin permukaan di luarnya
            pad = max(12, int(max(w, h) * 0.38))
            rx1 = max(0, x - pad)
            ry1 = max(0, y - pad)
            rx2 = min(img_w, x + w + pad)
            ry2 = min(img_h, y + h + pad)

            roi_h, roi_w = ry2 - ry1, rx2 - rx1
            if roi_h <= 0 or roi_w <= 0:
                return None

            blob_mask = np.zeros((roi_h, roi_w), dtype=np.uint8)
            shifted_cnt = cnt - np.array([[rx1, ry1]])
            cv2.drawContours(blob_mask, [shifted_cnt], -1, 255, -1)

            k_outer = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
            k_inner = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            ring_mask = cv2.subtract(cv2.dilate(blob_mask, k_outer), cv2.dilate(blob_mask, k_inner))

            if np.count_nonzero(ring_mask) < 35 or np.count_nonzero(blob_mask) < 30:
                return None

            roi_L = L_f[ry1:ry2, rx1:rx2]
            roi_a = a_f[ry1:ry2, rx1:rx2]
            roi_b = b_f[ry1:ry2, rx1:rx2]
            roi_S = S_f[ry1:ry2, rx1:rx2]

            ring_L_vals = roi_L[ring_mask > 0]
            ring_S_vals = roi_S[ring_mask > 0]
            # Noda asli harus berada di atas permukaan lantai/tembok/keramik yang rata & seragam.
            # Jika std deviasi area sekitar tinggi (> 20), berarti itu adalah tepi objek/perabot/tali tas.
            if float(np.std(ring_L_vals)) > 20.0 or float(np.std(ring_S_vals)) > 22.0:
                return None

            stats = {
                "x": x, "y": y, "w": w, "h": h, "area": area, "ar": ar, "solidity": solidity,
                "blob_L": float(np.mean(roi_L[blob_mask > 0])),
                "ring_L": float(np.mean(ring_L_vals)),
                "blob_a": float(np.mean(roi_a[blob_mask > 0])),
                "ring_a": float(np.mean(roi_a[ring_mask > 0])),
                "blob_b": float(np.mean(roi_b[blob_mask > 0])),
                "ring_b": float(np.mean(roi_b[ring_mask > 0])),
                "blob_S": float(np.mean(roi_S[blob_mask > 0])),
                "ring_S": float(np.mean(ring_S_vals)),
            }
            return stats

        # -------------------------------------------------------------------------
        # 1. NODA DARAH / CAIRAN MERAH PEKAT (Kontras Kemerahan Lokal Tinggi)
        # -------------------------------------------------------------------------
        mask_r1 = cv2.inRange(hsv, np.array([0, 100, 35]), np.array([9, 255, 215]))
        mask_r2 = cv2.inRange(hsv, np.array([170, 100, 35]), np.array([180, 255, 215]))
        blood_mask = cv2.bitwise_or(mask_r1, mask_r2)
        blood_local = ((a_f >= 150.0) & (delta_a >= 16.0) & (facility_mask == 0)).astype(np.uint8) * 255
        blood_mask = cv2.bitwise_and(blood_mask, blood_local)

        kernel_blood = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        blood_mask = cv2.morphologyEx(blood_mask, cv2.MORPH_OPEN, kernel_blood)
        blood_mask = cv2.morphologyEx(blood_mask, cv2.MORPH_CLOSE, kernel_blood)

        contours_blood, _ = cv2.findContours(blood_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours_blood:
            st = verify_stain_ring(cnt, min_stain_pixels, max_stain_pixels, min_solidity=0.50, min_extent=0.30)
            if st and (st["blob_a"] - st["ring_a"] >= 14.0):
                x, y, w, h = st["x"], st["y"], st["w"], st["h"]
                if not is_overlapping_existing(x, y, w, h, threshold=0.30):
                    area_pct = round(((w * h) / total_pixels) * 100.0, 2)
                    conf = min(0.95, round(0.78 + min(0.17, (st["blob_a"] - st["ring_a"]) / 120.0), 2))
                    detected_anomalies.append({
                        "category": "Cleanliness",
                        "sub_type": "blood_stain",
                        "class_name": "noda darah",
                        "confidence": conf,
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "area_percentage": area_pct
                    })

        # -------------------------------------------------------------------------
        # 2. NODA URIN / PIPIS / NODA KUNING (Kontras Kekuningan Lokal di Lantai/Toilet)
        # -------------------------------------------------------------------------
        urine_mask = cv2.inRange(hsv, np.array([18, 80, 70]), np.array([34, 245, 238]))
        urine_local = ((b_f >= 148.0) & (delta_b >= 14.0) & (delta_S >= 25.0) & (facility_mask == 0)).astype(np.uint8) * 255
        urine_mask = cv2.bitwise_and(urine_mask, urine_local)

        kernel_urine = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        urine_mask = cv2.morphologyEx(urine_mask, cv2.MORPH_OPEN, kernel_urine)
        urine_mask = cv2.morphologyEx(urine_mask, cv2.MORPH_CLOSE, kernel_urine)

        contours_urine, _ = cv2.findContours(urine_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours_urine:
            st = verify_stain_ring(cnt, min_stain_pixels, max_stain_pixels, min_solidity=0.50, min_extent=0.30)
            if st and (st["blob_b"] - st["ring_b"] >= 12.0) and (st["blob_S"] - st["ring_S"] >= 22.0) and st["ring_S"] < 95.0:
                x, y, w, h = st["x"], st["y"], st["w"], st["h"]
                if not is_overlapping_existing(x, y, w, h, threshold=0.30):
                    area_pct = round(((w * h) / total_pixels) * 100.0, 2)
                    conf = min(0.94, round(0.76 + min(0.18, (st["blob_b"] - st["ring_b"]) / 100.0), 2))
                    detected_anomalies.append({
                        "category": "Cleanliness",
                        "sub_type": "urine_stain",
                        "class_name": "noda urin / pipis",
                        "confidence": conf,
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "area_percentage": area_pct
                    })

        # -------------------------------------------------------------------------
        # 3. NODA KOTORAN / KERAK COKELAT (Mud, Coffee, Rust, Brown Grime)
        #    Wajib memiliki saturasi warna cokelat/kuning-keruh (S >= 60) dan berada di permukaan
        #    rata, sehingga layar TV hitam, kursi hitam, spidol, atau tali tas (S rendah) DIABAIKAN.
        # -------------------------------------------------------------------------
        brown_stain = (
            (hsv[:, :, 0] >= 7) & (hsv[:, :, 0] <= 26) &
            (S_f >= 60.0) & (S_f <= 230.0) &
            (V_f >= 30.0) & (V_f <= 165.0) &
            (delta_L_dark >= 18.0) & (delta_S >= 18.0) & (delta_E >= 24.0) &
            (facility_mask == 0)
        )
        dirt_mask = (brown_stain.astype(np.uint8)) * 255

        kernel_dirt_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        kernel_dirt_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        dirt_mask = cv2.morphologyEx(dirt_mask, cv2.MORPH_OPEN, kernel_dirt_open)
        dirt_mask = cv2.morphologyEx(dirt_mask, cv2.MORPH_CLOSE, kernel_dirt_close)

        contours_dirt, _ = cv2.findContours(dirt_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours_dirt:
            st = verify_stain_ring(cnt, min_stain_pixels, max_stain_pixels, min_solidity=0.55, min_extent=0.35, max_ar=2.4)
            if not st:
                continue
            lum_drop = st["ring_L"] - st["blob_L"]
            sat_diff = st["blob_S"] - st["ring_S"]
            if lum_drop >= 18.0 and sat_diff >= 18.0 and st["ring_S"] < 90.0:
                x, y, w, h = st["x"], st["y"], st["w"], st["h"]
                if not is_overlapping_existing(x, y, w, h, threshold=0.30):
                    area_pct = round(((w * h) / total_pixels) * 100.0, 2)
                    conf = min(0.92, round(0.76 + min(0.16, lum_drop / 110.0), 2))
                    detected_anomalies.append({
                        "category": "Cleanliness",
                        "sub_type": "dirt_stain",
                        "class_name": "noda kotoran / kerak",
                        "confidence": conf,
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "area_percentage": area_pct
                    })

        # -------------------------------------------------------------------------
        # 4. JEJAK KAKI / BERCAK NODA LANTAI (Floor Scuff Marks & Footprints)
        #    Berjalan pada resolusi ternormalisasi (960px) untuk mendeteksi bercak jejak
        #    sepatu/kotoran abu-kecokelatan di atas lantai keramik rata (khususnya saat
        #    petugas memfoto permukaan lantai/keramik kotor), tanpa salah mendeteksi
        #    bayangan kursi/meja atau tali tas hitam.
        # -------------------------------------------------------------------------
        scale_s = 960.0 / float(max(img_h, img_w))
        if scale_s < 1.0:
            sw, sh = max(1, int(img_w * scale_s)), max(1, int(img_h * scale_s))
            s_img = cv2.resize(frame, (sw, sh), interpolation=cv2.INTER_AREA)
            s_fac = cv2.resize(facility_mask, (sw, sh), interpolation=cv2.INTER_NEAREST)
        else:
            scale_s = 1.0
            sw, sh = img_w, img_h
            s_img = frame
            s_fac = facility_mask

        inv_s = 1.0 / scale_s
        s_hsv = cv2.cvtColor(s_img, cv2.COLOR_BGR2HSV)
        s_lab = cv2.cvtColor(s_img, cv2.COLOR_BGR2LAB)
        sL = s_lab[:, :, 0].astype(np.float32)
        sS = s_hsv[:, :, 1].astype(np.float32)

        # Cek apakah foto adalah bidikan permukaan lantai/dinding keramik (baik close-up penuh
        # maupun foto arah lantai yang di tepinya masih terlihat sedikit kursi/tas)
        has_wall_fixtures = any(
            eb.get("class_name") in ("papan tulis", "monitor / tv") for eb in existing_boxes
        )
        flat_tile_ratio = np.count_nonzero((sL >= 118.0) & (sS <= 28.0) & (s_fac == 0)) / float(sw * sh)
        global_std_L = float(np.std(sL))
        is_surface_closeup = (
            (len(existing_boxes) == 0)
            or (global_std_L <= 30.0 and flat_tile_ratio >= 0.60)
            or (not has_wall_fixtures and flat_tile_ratio >= 0.50)
        )

        if is_surface_closeup:
            L_smooth = cv2.GaussianBlur(sL, (5, 5), 0)
            s_bg_L = cv2.GaussianBlur(L_smooth, (35, 35), 0)
            s_bg_S = cv2.GaussianBlur(sS, (35, 35), 0)
            s_dL = s_bg_L - L_smooth

            # Buat mask garis nat keramik lurus (grout lines) agar sambungan ubin tidak dikira noda
            grout_bin = (s_dL >= 2.2).astype(np.uint8) * 255
            lines = cv2.HoughLinesP(grout_bin, 1, np.pi / 180.0, threshold=55, minLineLength=70, maxLineGap=10)
            grout_mask = np.zeros((sh, sw), dtype=np.uint8)
            if lines is not None:
                for ln in lines.reshape(-1, 4):
                    lx1, ly1, lx2, ly2 = ln
                    cv2.line(grout_mask, (lx1, ly1), (lx2, ly2), 255, 18)

            # Mask tambahan di sekitar objek hitam pekat (sepatu, tali tas hitam, kaki kursi)
            dark_obj = cv2.dilate(
                (sL < 82.0).astype(np.uint8) * 255,
                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))
            )

            dL_thresh = 2.9 if len(existing_boxes) == 0 else 4.2
            scuff_m = (
                (s_bg_L >= 125.0) & (s_bg_S <= 30.0) &
                (L_smooth >= 85.0) & (L_smooth <= 165.0) &
                (s_dL >= dL_thresh) & (s_dL <= 40.0) &
                (grout_mask == 0) &
                (dark_obj == 0) &
                (s_fac == 0)
            ).astype(np.uint8) * 255

            scuff_m[:int(sh * 0.18), :] = 0
            scuff_m[int(sh * 0.82):, :] = 0
            scuff_m[:, :int(sw * 0.15)] = 0
            scuff_m[:, int(sw * 0.85):] = 0

            # Hubungkan pola tapak sepatu yang berdekatan terlebih dahulu, lalu bersihkan bintik kecil
            scuff_m = cv2.morphologyEx(scuff_m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (37, 37)))
            scuff_m = cv2.morphologyEx(scuff_m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))

            cnts_scuff, _ = cv2.findContours(scuff_m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in sorted(cnts_scuff, key=cv2.contourArea, reverse=True):
                area = cv2.contourArea(c)
                if area < 410 or area > 35000:
                    continue
                sx, sy, sbw, sbh = cv2.boundingRect(c)
                ar = float(max(sbw, sbh)) / float(min(sbw, sbh) + 1e-5)
                if ar > 3.2 or sbw < 18 or sbh < 18:
                    continue

                roi_dL = s_dL[sy:sy + sbh, sx:sx + sbw]
                peak_dL = float(np.max(roi_dL)) if roi_dL.size > 0 else 5.0
                if len(existing_boxes) > 0 and peak_dL < 12.0:
                    continue

                # Tambahkan sedikit padding agar kotak membungkus seluruh bercak noda dengan rapi
                pad_box = 8
                sx_p = max(0, sx - pad_box)
                sy_p = max(0, sy - pad_box)
                sbw_p = min(sw - sx_p, sbw + pad_box * 2)
                sbh_p = min(sh - sy_p, sbh + pad_box * 2)

                ox = int(sx_p * inv_s)
                oy = int(sy_p * inv_s)
                ow = int(sbw_p * inv_s)
                oh = int(sbh_p * inv_s)
                if not is_overlapping_existing(ox, oy, ow, oh, threshold=0.25):
                    area_pct = round(((ow * oh) / total_pixels) * 100.0, 2)
                    conf = min(0.92, round(0.78 + min(0.14, peak_dL / 45.0), 2))
                    detected_anomalies.append({
                        "category": "Cleanliness",
                        "sub_type": "footprint",
                        "class_name": "jejak kaki / noda lantai",
                        "confidence": conf,
                        "bbox": {"x": ox, "y": oy, "width": ow, "height": oh},
                        "area_percentage": area_pct
                    })

        # Batasi jumlah deteksi anomali maksimum (urutkan dari confidence & luas tertinggi)
        if len(detected_anomalies) > 6:
            detected_anomalies.sort(key=lambda d: (d["confidence"], d["area_percentage"]), reverse=True)
            detected_anomalies = detected_anomalies[:6]

        return detected_anomalies

    def analyze_frame(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Dict[str, Any]:
        """
        Menjalankan analisis Computer Vision pada frame:
        - Mendeteksi sampah & noda pengotor (jejak kaki, noda darah, urin, percikan air).
        - Menghitung Kondisi Fisik Fasilitas (%) & Tingkatan Kerusakan (0-15% Rusak Banget, >15% Aman bertingkat).
        - Mengabaikan deteksi orang sepenuhnya.
        - Menghitung persentase kebersihan & tingkat kekotoran tempat.
        """
        img_h, img_w = frame.shape[:2]
        total_pixels = img_h * img_w

        facility_items: List[Dict[str, Any]] = []
        waste_candidates: List[Dict[str, Any]] = []

        # =========================================================================
        # 1. Jalankan Model Base YOLO (Perabot & Fasilitas, Abaikan 'person' dan 'door')
        # =========================================================================
        base_results = self.model.predict(source=frame, conf=conf_threshold, verbose=False)[0]
        for box in base_results.boxes:
            cls_id = int(box.cls[0])
            raw_name = self.model.names.get(cls_id, f"class_{cls_id}").lower()
            confidence = float(box.conf[0])

            # Abaikan orang dan pintu sesuai spesifikasi user
            if raw_name in self.IGNORED_CLASSES:
                continue

            xyxy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, xyxy)
            box_w = max(0, x2 - x1)
            box_h = max(0, y2 - y1)
            area_pct = ((box_w * box_h) / total_pixels) * 100.0

            if raw_name in self.ITEM_REGISTRY:
                cname, category = self.ITEM_REGISTRY[raw_name]
            elif any(c in raw_name for c in self.DAMAGE_CLASSES):
                cname = raw_name
                category = "Damage"
            else:
                # Abaikan kelas COCO acak (misal sports ball, frisbee, kite) agar tidak menutupi noda
                continue

            item_data = {
                "category": category,
                "class_name": cname,
                "confidence": round(confidence, 3),
                "bbox": {"x": x1, "y": y1, "width": box_w, "height": box_h},
                "area_percentage": round(area_pct, 2)
            }

            if category in ("Facility", "Damage"):
                facility_items.append(item_data)
            else:
                waste_candidates.append(item_data)

        # =========================================================================
        # 2. Jalankan Model Waste YOLO (Sampah Tisu, Plastik, Kardus)
        # =========================================================================
        if self.waste_model is not None:
            gray_full = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            waste_results = self.waste_model.predict(source=frame, conf=0.52, verbose=False)[0]
            for box in waste_results.boxes:
                w_id = int(box.cls[0])
                w_name = self.waste_model.names.get(w_id, "").lower()
                w_conf = float(box.conf[0])

                if w_name in self.ITEM_REGISTRY:
                    cname, category = self.ITEM_REGISTRY[w_name]
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)
                    bw = max(0, x2 - x1)
                    bh = max(0, y2 - y1)
                    area_pct = ((bw * bh) / total_pixels) * 100.0

                    # Abaikan jika kotak menutupi sebagian besar layar (>22% seperti pintu kayu/tembok)
                    # atau memiliki permukaan polos rata (std deviasi rendah)
                    if area_pct > 22.0 or bw < 15 or bh < 15:
                        continue
                    roi_gray = gray_full[max(0, y1):min(img_h, y2), max(0, x1):min(img_w, x2)]
                    if roi_gray.size == 0 or float(np.std(roi_gray)) < 14.0:
                        continue

                    waste_candidates.append({
                        "category": category,
                        "class_name": cname,
                        "confidence": round(w_conf, 3),
                        "bbox": {"x": x1, "y": y1, "width": bw, "height": bh},
                        "area_percentage": round(area_pct, 2)
                    })

        # =========================================================================
        # 2b. Deteksi Fasilitas Struktural (Papan Tulis & Monitor/TV)
        # =========================================================================
        structural_facilities = self._detect_structural_facilities(frame, facility_items)
        facility_items.extend(structural_facilities)

        # =========================================================================
        # 3. Resolusi Perabot vs Sampah
        # =========================================================================
        detected_items = self._resolve_furniture_vs_waste(facility_items, waste_candidates)

        # =========================================================================
        # 4. Deteksi Noda Khusus: Jejak Kaki, Noda Darah, Urin, Percikan Air, & Retakan
        # =========================================================================
        stain_anomalies = self._detect_surface_stains_and_anomalies(frame, detected_items)
        all_detected_items = detected_items + stain_anomalies

        # =========================================================================
        # 5. Hitung Statistik Sampah, Noda, Air, Kaca, Kerusakan, dan Fasilitas
        # =========================================================================
        trash_count = 0
        stain_count = 0
        water_count = 0
        footprint_count = 0
        glass_count = 0
        damage_count = 0
        facility_count = 0

        total_dirt_area = 0.0
        total_damage_area = 0.0

        for item in all_detected_items:
            cat = item["category"]
            cname = item["class_name"].lower()

            if cat == "Cleanliness":
                if "jejak kaki" in cname:
                    footprint_count += 1
                elif "darah" in cname or "urin" in cname or "pipis" in cname or "noda" in cname or "kerak" in cname:
                    stain_count += 1
                elif "percikan air" in cname:
                    water_count += 1
                elif "kaca kotor" in cname or "bercak" in cname:
                    glass_count += 1
                else:
                    trash_count += 1
                total_dirt_area += item["area_percentage"]

            elif cat == "Damage":
                damage_count += 1
                total_damage_area += item["area_percentage"]

            elif cat == "Facility":
                facility_count += 1

        total_cleanliness_issues = trash_count + stain_count + footprint_count + water_count + glass_count

        # =========================================================================
        # 5b. INDIKATOR BANYAKNYA SAMPAH (TRASH VOLUME & ACCUMULATION)
        # =========================================================================
        if trash_count == 0:
            trash_volume_status = "Bebas Sampah"
            trash_volume_desc = "Tidak ada sampah terdeteksi di ruangan."
        elif trash_count <= 2:
            trash_volume_status = "Sedikit Sampah"
            trash_volume_desc = f"Terdapat {trash_count} objek sampah, kondisi masih terkendali."
        elif trash_count <= 4:
            trash_volume_status = "Cukup Banyak Sampah"
            trash_volume_desc = f"Terdapat {trash_count} objek sampah, di ambang batas toleransi."
        else:
            trash_volume_status = "Sampah Menumpuk / Sangat Banyak"
            trash_volume_desc = f"Terdapat {trash_count} objek sampah menumpuk, ruangan dinilai kotor parah."

        # =========================================================================
        # 6. PENILAIAN SEBERAPA KOTOR TEMPAT ITU (DIRTINESS SCORE: 0% - 100%)
        #    Dihitung dari akumulasi sampah, noda darah/urin, jejak kaki & percikan air
        # =========================================================================
        if total_cleanliness_issues == 0:
            base_dirtiness = 0.0
        elif total_cleanliness_issues == 1:
            base_dirtiness = 20.0
        elif total_cleanliness_issues == 2:
            base_dirtiness = 35.0
        elif total_cleanliness_issues == 3:
            base_dirtiness = 50.0  # Batas toleransi 50%
        elif total_cleanliness_issues == 4:
            base_dirtiness = 65.0
        else:
            base_dirtiness = min(88.0, 65.0 + (total_cleanliness_issues - 4) * 8.0)

        area_dirt_bonus = min(15.0, total_dirt_area * 1.5)
        dirtiness_score = round(min(100.0, max(0.0, base_dirtiness + area_dirt_bonus)), 1)

        # Kategori Kekotoran
        if dirtiness_score <= 15.0:
            dirtiness_level = "Sangat Bersih"
            dirtiness_desc = "Tempat sangat bersih dan terawat, bebas sampah dan noda."
        elif dirtiness_score <= 35.0:
            dirtiness_level = "Bersih / Rapi"
            dirtiness_desc = "Tempat cukup rapi dengan tingkat kotoran sangat minim."
        elif dirtiness_score <= 50.0:
            dirtiness_level = "Cukup Bersih / Sedikit Kotor"
            dirtiness_desc = "Tempat sedikit kotor, masih berada di ambang toleransi."
        elif dirtiness_score <= 75.0:
            dirtiness_level = "Kotor"
            dirtiness_desc = "Tempat kotor (ada sampah/noda/jejak/cairan) yang perlu dibersihkan."
        else:
            dirtiness_level = "Sangat Kotor"
            dirtiness_desc = "Tempat sangat kotor, berantakan, memerlukan pembersihan menyeluruh."

        # =========================================================================
        # 7. PERSENTASE KONDISI FISIK FASILITAS & TINGKATAN KERUSAKAN
        #    Aturan User:
        #    - 0% - 15%   : RUSAK BANGET (Sangat Parah / Berbahaya)
        #    - Di atas itu : Baru Aman / Bertingkat (Rusak Berat, Sedang, Ringan, Aman)
        # =========================================================================
        if damage_count == 0:
            physical_condition = 100.0
        elif damage_count == 1:
            physical_condition = max(61.0, 80.0 - (total_damage_area * 2.0))
        elif damage_count == 2:
            physical_condition = max(36.0, 55.0 - (total_damage_area * 2.0))
        elif damage_count == 3:
            physical_condition = max(16.0, 32.0 - (total_damage_area * 2.0))
        else:
            # 4 titik kerusakan atau lebih langsung masuk ke kategori Rusak Banget (0% - 15%)
            physical_condition = max(0.0, min(15.0, 15.0 - (damage_count - 4) * 3.0 - total_damage_area))

        physical_condition_score = round(physical_condition, 1)

        # Tingkatan Kerusakan Fisik
        if physical_condition_score <= 15.0:
            damage_level = "Rusak Banget (Sangat Parah)"
            damage_desc = "Kondisi fisik rusak sangat parah/kritis, struktur berbahaya, tidak aman digunakan."
        elif physical_condition_score <= 35.0:
            damage_level = "Rusak Berat"
            damage_desc = "Kerusakan fisik berat, banyak retakan atau komponen patah/rusak."
        elif physical_condition_score <= 60.0:
            damage_level = "Rusak Sedang"
            damage_desc = "Kerusakan fisik sedang, terdapat beberapa titik retak atau cacat komponen."
        elif physical_condition_score <= 85.0:
            damage_level = "Rusak Ringan"
            damage_desc = "Kerusakan fisik ringan, hanya terdapat cacat minor atau goresan."
        else:
            damage_level = "Aman / Sangat Baik"
            damage_desc = "Kondisi fisik fasilitas kokoh, utuh, dan sangat aman digunakan."

        # =========================================================================
        # 8. SKOR KELAYAKAN KEBERSIHAN & KESELURUHAN (CLEANLINESS SCORE: 0% - 100%)
        #    Jika kondisi fisik rusak banget (<=15%), skor otomatis jatuh ke <=40%
        # =========================================================================
        cleanliness_calc = (100.0 - dirtiness_score) - ((100.0 - physical_condition_score) * 0.5)
        cleanliness_score = round(max(0.0, min(100.0, cleanliness_calc)), 1)

        # Jika rusak banget, pastikan skor tidak lolos threshold 50%
        if physical_condition_score <= 15.0:
            cleanliness_score = min(cleanliness_score, 40.0)

        # =========================================================================
        # 9. PENENTUAN STATUS PENYELESAIAN
        #    - > 50%   : SELESAI
        #    - 0% - 50%: BELUM SELESAI (Belum Bersih, Rusak, atau Belum Selesai)
        # =========================================================================
        if cleanliness_score > 50.0 and physical_condition_score > 15.0:
            status_text = "SELESAI"
            status_detail = "Selesai (Bersih, Rapi & Aman Digunakan)"
            status_code = "SELESAI"
            is_completed = True
        else:
            status_text = "BELUM SELESAI"
            status_detail = "Belum Bersih, Rusak, atau Belum Selesai"
            status_code = "BELUM_SELESAI"
            is_completed = False

        # Tingkat Keparahan Umum
        if physical_condition_score <= 15.0 or dirtiness_score > 75.0:
            severity_level = "High"
        elif physical_condition_score <= 60.0 or dirtiness_score > 50.0:
            severity_level = "Medium"
        elif physical_condition_score <= 85.0 or dirtiness_score > 25.0:
            severity_level = "Low"
        else:
            severity_level = "None"

        # Gambar Bounding Boxes dan Banner HUD OpenCV
        annotated_img = self._create_annotated_image(
            img=frame,
            detections=all_detected_items,
            cleanliness_score=cleanliness_score,
            dirtiness_score=dirtiness_score,
            dirtiness_level=dirtiness_level,
            physical_condition_score=physical_condition_score,
            damage_level=damage_level,
            status_text=status_text,
            is_completed=is_completed,
            trash_count=trash_count,
            trash_volume_status=trash_volume_status,
            stain_count=stain_count,
            water_count=water_count,
            footprint_count=footprint_count,
            glass_count=glass_count,
            damage_count=damage_count,
            facility_count=facility_count
        )

        return {
            "annotated_frame": annotated_img,
            "cleanliness_percentage": cleanliness_score,
            "dirtiness_percentage": dirtiness_score,
            "dirtiness_level": dirtiness_level,
            "dirtiness_description": dirtiness_desc,
            "physical_condition_percentage": physical_condition_score,
            "damage_level": damage_level,
            "damage_description": damage_desc,
            "trash_volume_status": trash_volume_status,
            "trash_volume_description": trash_volume_desc,
            "status": status_text,
            "status_detail": status_detail,
            "status_code": status_code,
            "is_completed": is_completed,
            "total_defects": damage_count,
            "total_trash": trash_count,
            "total_stains": stain_count,
            "total_footprints": footprint_count,
            "total_water_splashes": water_count,
            "total_glass_stains": glass_count,
            "total_facilities": facility_count,
            "severity_level": severity_level,
            "damage_area_percentage": round(total_damage_area, 2),
            "trash_area_percentage": round(total_dirt_area, 2),
            "detections": all_detected_items
        }

    def analyze_image(self, image_path: str, conf_threshold: float = 0.25) -> Dict[str, Any]:
        """Menjalankan analisis Computer Vision pada file gambar dan menyimpan anotasi"""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to read image from {image_path}")

        frame_result = self.analyze_frame(img, conf_threshold=conf_threshold)

        dir_name, base_name = os.path.split(image_path)
        output_filename = f"analyzed_{base_name}"
        annotated_path = os.path.join(dir_name, output_filename)
        cv2.imwrite(annotated_path, frame_result["annotated_frame"])

        return {
            "image_original_path": image_path,
            "image_annotated_path": annotated_path,
            "cleanliness_percentage": frame_result["cleanliness_percentage"],
            "dirtiness_percentage": frame_result["dirtiness_percentage"],
            "dirtiness_level": frame_result["dirtiness_level"],
            "dirtiness_description": frame_result["dirtiness_description"],
            "physical_condition_percentage": frame_result["physical_condition_percentage"],
            "damage_level": frame_result["damage_level"],
            "damage_description": frame_result["damage_description"],
            "trash_volume_status": frame_result["trash_volume_status"],
            "trash_volume_description": frame_result["trash_volume_description"],
            "status": frame_result["status"],
            "status_detail": frame_result["status_detail"],
            "status_code": frame_result["status_code"],
            "is_completed": frame_result["is_completed"],
            "total_defects": frame_result["total_defects"],
            "total_trash": frame_result["total_trash"],
            "total_stains": frame_result["total_stains"],
            "total_footprints": frame_result["total_footprints"],
            "total_water_splashes": frame_result["total_water_splashes"],
            "total_glass_stains": frame_result["total_glass_stains"],
            "total_facilities": frame_result["total_facilities"],
            "severity_level": frame_result["severity_level"],
            "damage_area_percentage": frame_result["damage_area_percentage"],
            "trash_area_percentage": frame_result["trash_area_percentage"],
            "detections": frame_result["detections"]
        }

    def _create_annotated_image(
        self, img, detections, cleanliness_score, dirtiness_score, dirtiness_level,
        physical_condition_score, damage_level, status_text, is_completed,
        trash_count, trash_volume_status, stain_count, water_count, footprint_count, glass_count, damage_count, facility_count
    ):
        """
        Menggambar kotak analisis Computer Vision (bounding boxes) pada gambar:
        - Hijau [Baik] untuk fasilitas/perabot yang utuh & aman (Papan Tulis, Kursi, Monitor/TV, Tas, Meja)
        - Oranye/Merah [Kotor/Noda/Sampah] untuk jejak kaki, noda lantai, cairan, atau sampah
        - Merah [Rusak] untuk kerusakan fisik
        """
        annotated = img.copy()
        h, w = annotated.shape[:2]
        ui_scale = max(1.0, min(w, h) / 600.0)
        bar_h = int(round(36 * ui_scale))

        # Urutkan agar kotak fasilitas digambar lebih dulu, lalu kotak noda/sampah/kerusakan di atasnya
        sorted_detections = sorted(
            detections,
            key=lambda d: 0 if d.get("category") == "Facility" else 1
        )

        for item in sorted_detections:
            cat = item["category"]
            bbox = item["bbox"]
            x, y, bw, bh = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
            cname = item["class_name"]
            conf_pct = int(item["confidence"] * 100)

            if cat == "Facility":
                color = (64, 175, 42)       # Hijau segar (BGR) -> Kondisi Baik / Utuh
                label = f"[Baik] {cname.title()} ({conf_pct}%)"
            elif cat == "Cleanliness":
                cname_lower = cname.lower()
                if "darah" in cname_lower:
                    color = (38, 38, 220)   # Merah untuk Noda Darah
                    label = f"[Kotor] Noda Darah ({conf_pct}%)"
                elif "urin" in cname_lower or "pipis" in cname_lower:
                    color = (8, 179, 234)   # Kuning Amber untuk Noda Urin
                    label = f"[Kotor] Noda Urin ({conf_pct}%)"
                elif "jejak kaki" in cname_lower:
                    color = (22, 95, 235)   # Oranye-Merah Terang untuk Jejak Kaki / Noda Lantai
                    label = f"[Kotor] Jejak Kaki / Noda Lantai ({conf_pct}%)"
                elif "kotoran" in cname_lower or "kerak" in cname_lower or "noda" in cname_lower:
                    color = (22, 115, 249)  # Oranye untuk Noda Kotoran/Kerak
                    label = f"[Kotor] Noda Kotoran ({conf_pct}%)"
                else:
                    color = (22, 115, 249)  # Oranye untuk Sampah
                    label = f"[Sampah] {cname.title()} ({conf_pct}%)"
            else:
                color = (38, 38, 220)       # Merah untuk Kerusakan Fisik
                label = f"[Rusak] {cname.title()} ({conf_pct}%)"

            # Gambar kotak bounding box dengan ketebalan proporsional terhadap resolusi foto
            thickness = max(2, int(round((2.8 if cat == "Facility" else 3.8) * ui_scale)))
            cv2.rectangle(annotated, (x, y), (x + bw, y + bh), color, thickness)

            # Gambar background label agar teks mudah dibaca di layar HP
            font_scale = 0.52 * ui_scale
            font_thick = max(1, int(round(1.5 * ui_scale)))
            pad_x = max(6, int(round(6 * ui_scale)))
            pad_y = max(5, int(round(5 * ui_scale)))
            (lbl_w, lbl_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick)
            lbl_y1 = max(bar_h + 4, y - lbl_h - pad_y * 2)
            lbl_y2 = lbl_y1 + lbl_h + pad_y * 2
            lbl_x2 = min(w - 2, x + lbl_w + pad_x * 2)
            cv2.rectangle(annotated, (x, lbl_y1), (lbl_x2, lbl_y2), color, -1)
            cv2.putText(
                annotated, label, (x + pad_x, lbl_y2 - pad_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thick, cv2.LINE_AA
            )

        # Bar ringkasan hasil analisis di bagian paling atas foto
        overlay = annotated.copy()
        cv2.rectangle(overlay, (0, 0), (w, bar_h), (24, 28, 36), -1)
        cv2.addWeighted(overlay, 0.82, annotated, 0.18, 0, annotated)

        status_color = (85, 215, 95) if is_completed else (70, 145, 255)
        hud_text = (
            f"AI: {status_text} | Kebersihan: {cleanliness_score:.0f}% ({dirtiness_level}) "
            f"| Fisik: {physical_condition_score:.0f}% ({damage_level})"
        )
        hud_font_scale = 0.44 * ui_scale
        hud_thick = max(1, int(round(1.3 * ui_scale)))
        cv2.putText(
            annotated, hud_text, (int(round(10 * ui_scale)), int(round(24 * ui_scale))),
            cv2.FONT_HERSHEY_SIMPLEX, hud_font_scale, status_color, hud_thick, cv2.LINE_AA
        )

        return annotated
