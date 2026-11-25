// Data Types for UPI Facility Care Mobile Application

export interface Task {
  id: string;
  assetCode?: string;
  judul: string;
  lokasi: string;
  petugas: string;
  prioritas: 'Normal' | 'Tinggi' | 'Darurat';
  tenggat: string;
  deskripsi: string;
  status: 'Menunggu' | 'Diproses' | 'Selesai';
  catatan: string;
  foto: string;
  annotatedPhotoUrl?: string;
  cleanlinessPercentage?: number;
  dirtinessPercentage?: number;
  physicalConditionPercentage?: number;
  aiStatus?: string;
  inspectionId?: number;
  completedAt?: string;
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['prioritas'];

export interface Asset {
  code: string;
  name: string;
  location: string;
  building: string;
  category: string;
  condition: 'Baik' | 'Perlu Perhatian' | 'Kritis';
  status?: string;
  lastCleaned?: string;
  floor?: number;
}

export interface Room {
  room_id: number;
  room_code: string;
  room_name: string;
  building: string;
  floor_number?: number;
  room_type?: string;
  status?: string;
}

export interface DetectionItem {
  category: string;
  class_name: string;
  confidence: number;
  area_percentage: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AiInspectionResult {
  success: boolean;
  inspection_id?: number;
  db_saved?: boolean;
  db_message?: string;
  room_id?: number;
  status: string;
  status_detail: string;
  status_code?: string;
  is_completed: boolean;
  cleanliness_percentage: number;
  dirtiness_percentage: number;
  dirtiness_level: string;
  dirtiness_description?: string;
  physical_condition_percentage: number;
  damage_level: string;
  damage_description?: string;
  trash_volume_status?: string;
  trash_volume_description?: string;
  total_defects: number;
  total_trash: number;
  total_stains: number;
  total_footprints?: number;
  total_water_splashes?: number;
  total_glass_stains?: number;
  severity_level: string;
  original_image_url?: string | null;
  annotated_image_url?: string | null;
  detections?: DetectionItem[];
}
