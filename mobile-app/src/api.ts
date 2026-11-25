import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, AiInspectionResult, Room } from './types';
import { loadTasks, saveTasks, initialTasks } from './storage';

export const SERVER_STORAGE_KEY = 'upiFacilityCare_serverUrl';
// Default to the current Wi-Fi LAN IP discovered on the host
export const DEFAULT_SERVER_URL = 'http://10.62.247.203:8000';

/**
 * Mendapatkan Server URL dari local storage atau default IP
 */
export async function getServerUrl(): Promise<string> {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (
      window.location.protocol === 'https:' ||
      host.includes('up.railway.app') ||
      host.includes('trycloudflare.com') ||
      host.includes('loca.lt') ||
      host.includes('ngrok') ||
      host.includes('hf.space') ||
      host.includes('onrender.com')
    ) {
      return `${window.location.protocol}//${window.location.host}`;
    }
    // Jika dibuka di browser lokal atau LAN IP yang sama, otomatis gunakan hostname aktif di port 8000
    try {
      const saved = await AsyncStorage.getItem(SERVER_STORAGE_KEY);
      if (saved && saved.trim() && saved.includes(host)) {
        return saved.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
    return `http://${host}:8000`;
  }
  try {
    const saved = await AsyncStorage.getItem(SERVER_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    console.warn('Gagal membaca SERVER_STORAGE_KEY:', e);
  }
  return DEFAULT_SERVER_URL;
}

/**
 * Menyimpan Server URL baru
 */
export async function setServerUrl(url: string): Promise<boolean> {
  try {
    const cleaned = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(SERVER_STORAGE_KEY, cleaned);
    return true;
  } catch (e) {
    console.error('Gagal menyimpan server URL:', e);
    return false;
  }
}

/**
 * Mengecek apakah server API aktif dan sehat
 */
export async function checkServerHealth(): Promise<{ ok: boolean; message: string; database?: any }> {
  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${base}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        message: 'Terhubung ke Server API',
        database: data.database,
      };
    }
    return { ok: false, message: `Server merespon dengan status ${res.status}` };
  } catch (e: any) {
    return { ok: false, message: e.name === 'AbortError' ? 'Koneksi timeout' : (e.message || 'Server offline') };
  }
}

let lastSavedTasksSig = '';

/**
 * Mengambil daftar tasks dari server, atau fallback ke local storage jika server offline
 */
export async function fetchTasksWithSync(): Promise<{ tasks: Task[]; fromServer: boolean }> {
  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${base}/api/tasks`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const normalizedTasks: Task[] = result.data.map((t: Task) => ({
          ...t,
          foto: t.foto && t.foto.startsWith('/') ? `${base}${t.foto}` : t.foto,
        }));
        const sig =
          normalizedTasks.length === 0
            ? 'EMPTY'
            : normalizedTasks
                .map(
                  t =>
                    `${t.id}:${t.status}:${t.prioritas}:${(t.foto || '').length}:${t.catatan || ''}`
                )
                .join('|');
        if (sig !== lastSavedTasksSig) {
          lastSavedTasksSig = sig;
          await saveTasks(normalizedTasks);
        }
        return { tasks: normalizedTasks, fromServer: true };
      }
    }
  } catch (e) {
    console.log('Server offline atau tidak terjangkau, menggunakan data offline lokal.');
  }

  // Fallback ke local AsyncStorage
  const local = await loadTasks();
  return { tasks: local, fromServer: false };
}

/**
 * Mengirim tugas baru ke server API dan menyimpan di lokal
 */
export async function createTaskApi(task: Task): Promise<{ success: boolean; fromServer: boolean }> {
  let fromServer = false;
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        fromServer = true;
      }
    }
  } catch (e) {
    console.log('Tidak dapat mengirim task ke server, simpan di lokal saja.');
  }

  // Simpan juga di local storage
  const current = await loadTasks();
  const updated = [task, ...current.filter(t => t.id !== task.id)];
  await saveTasks(updated);

  return { success: true, fromServer };
}

/**
 * Mengirim penyelesaian tugas / laporan pekerjaan ke API
 */
export async function submitTaskReportApi(
  taskId: string,
  payload: {
    status: Task['status'];
    catatan: string;
    foto_url?: string;
    cleanliness_percentage?: number;
    dirtiness_percentage?: number;
    physical_condition_percentage?: number;
    ai_status?: string;
    inspection_id?: number;
  }
): Promise<{ success: boolean; fromServer: boolean }> {
  let fromServer = false;
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        fromServer = true;
      }
    }
  } catch (e) {
    console.log('Server tidak terjangkau saat submit task report.');
  }

  // Update local storage juga
  const current = await loadTasks();
  const updated = current.map(t => {
    if (t.id === taskId) {
      return {
        ...t,
        status: payload.status,
        catatan: payload.catatan,
        foto: payload.foto_url || t.foto,
        annotatedPhotoUrl: payload.foto_url,
        cleanlinessPercentage: payload.cleanliness_percentage,
        dirtinessPercentage: payload.dirtiness_percentage,
        physicalConditionPercentage: payload.physical_condition_percentage,
        aiStatus: payload.ai_status,
        inspectionId: payload.inspection_id,
      };
    }
    return t;
  });
  await saveTasks(updated);

  return { success: true, fromServer };
}

/**
 * Mengirim foto ke server Computer Vision untuk dianalisis oleh model YOLOv8
 */
export async function inspectImageWithAi(
  imageUri: string,
  roomId: number = 1,
  taskId?: string,
  notes?: string
): Promise<AiInspectionResult> {
  const base = await getServerUrl();
  const formData = new FormData();
  formData.append('room_id', roomId.toString());
  if (taskId) formData.append('task_id', taskId);
  if (notes) formData.append('notes', notes);

  if (typeof window !== 'undefined' && (imageUri.startsWith('data:') || imageUri.startsWith('blob:') || imageUri.startsWith('http'))) {
    try {
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      formData.append('file', blob, 'facility_inspection.jpg');
    } catch (e) {
      if (imageUri.startsWith('data:')) {
        const parts = imageUri.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const b64 = atob(parts[1]);
        const u8 = new Uint8Array(b64.length);
        for (let i = 0; i < b64.length; i++) {
          u8[i] = b64.charCodeAt(i);
        }
        formData.append('file', new Blob([u8], { type: mime }), 'facility_inspection.jpg');
      }
    }
  } else {
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'facility_inspection.jpg',
    } as any);
  }

  const res = await fetch(`${base}/api/inspect`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Server error ${res.status}`);
  }

  const data: AiInspectionResult = await res.json();
  // Jika URL berupa path relatif, sambungkan dengan base server URL
  if (data.annotated_image_url && data.annotated_image_url.startsWith('/')) {
    data.annotated_image_url = `${base}${data.annotated_image_url}`;
  }
  if (data.original_image_url && data.original_image_url.startsWith('/')) {
    data.original_image_url = `${base}${data.original_image_url}`;
  }
  return data;
}

/**
 * Mengambil daftar ruangan/assets
 */
export async function fetchRoomsApi(): Promise<Room[]> {
  const fallbackRooms: Room[] = [
    { room_id: 1, room_code: 'AST-001', room_name: 'Toilet Gedung A', building: 'Gedung A', floor_number: 2, room_type: 'Toilet', status: 'Aktif' },
    { room_id: 2, room_code: 'AST-002', room_name: 'Ballroom Gedung A', building: 'Gedung A', floor_number: 5, room_type: 'Ballroom', status: 'Tutup' },
    { room_id: 3, room_code: 'AST-003', room_name: 'Toilet Gedung A', building: 'Gedung A', floor_number: 1, room_type: 'Toilet', status: 'Aktif' },
    { room_id: 4, room_code: 'AST-004', room_name: 'Koridor Gedung C', building: 'Gedung C', floor_number: 3, room_type: 'Koridor', status: 'Aktif' },
    { room_id: 5, room_code: 'AST-005', room_name: 'Perpustakaan', building: 'Gedung A', floor_number: 1, room_type: 'Perpustakaan', status: 'Aktif' },
    { room_id: 6, room_code: 'AST-006', room_name: 'Koridor Prodi', building: 'Prodi Bisnis', floor_number: 3, room_type: 'Koridor', status: 'Aktif' },
  ];

  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${base}/api/rooms`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch (e) {
    // Gunakan fallback jika offline
  }
  return fallbackRooms;
}

/**
 * Menyimpan ruangan / aset baru ke dalam Microsoft SQL Server
 */
export async function createRoomApi(room: {
  room_code: string;
  room_name: string;
  building: string;
  floor_number: number;
  room_type: string;
  status?: string;
}): Promise<{ success: boolean; room_id?: number; error?: string }> {
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, error: e.message || 'Gagal terhubung ke SQL Server' };
  }
}

/**
 * Mengubah status ruangan (Aktif / Tutup) di Microsoft SQL Server
 */
export async function updateRoomStatusApi(roomCode: string, status: string): Promise<boolean> {
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/rooms/${roomCode}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (e) {
    console.error('Failed to update room status:', e);
  }
  return false;
}

export interface DamageReportDto {
  id: string;
  judul: string;
  lokasi: string;
  pelapor?: string;
  urgensi: 'Mendesak' | 'Tinggi' | 'Sedang';
  tanggal: string;
  jam: string;
  waktu: string;
  status: 'Dalam Peninjauan' | 'Terkirim' | 'Diproses' | 'Selesai' | 'Ditolak';
  kategori?: string[];
  catatan: string;
  foto: string;
}

/**
 * Mengambil seluruh laporan kerusakan dari tabel DamageReports di Microsoft SQL Server
 */
export async function fetchDamageReportsApi(): Promise<DamageReportDto[] | null> {
  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/reports`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((r: DamageReportDto) => ({
          ...r,
          foto: r.foto && r.foto.startsWith('/') ? `${base}${r.foto}` : r.foto,
        }));
      }
    }
  } catch {
    // Offline fallback
  }
  return null;
}

/**
 * Menyimpan laporan kerusakan baru dari Petugas ke tabel DamageReports di Microsoft SQL Server
 */
export async function createDamageReportApi(
  report: DamageReportDto
): Promise<{ success: boolean; fromServer: boolean }> {
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, fromServer: true };
      }
    }
  } catch {
    // Offline fallback
  }
  return { success: true, fromServer: false };
}

/**
 * Mengubah status laporan kerusakan di Microsoft SQL Server
 */
export async function updateDamageReportStatusApi(
  reportId: string,
  status: string
): Promise<boolean> {
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch {
    // Offline fallback
  }
  return false;
}

export interface RecentInspectionDto {
  inspection_id: number;
  inspection_date: string;
  room_code: string;
  room_name: string;
  building: string;
  floor_number: number;
  cleanliness_percentage: number;
  total_defects: number;
  total_trash: number;
  severity_level: string;
  status: string;
  notes?: string;
  image_url: string;
}

/**
 * Mengambil riwayat hasil inspeksi AI Computer Vision langsung dari tabel Inspections di Microsoft SQL Server
 */
export async function fetchRecentInspectionsApi(limit: number = 15): Promise<RecentInspectionDto[]> {
  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/inspections?limit=${limit}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((item: RecentInspectionDto) => ({
          ...item,
          image_url:
            item.image_url && item.image_url.startsWith('/')
              ? `${base}${item.image_url}`
              : item.image_url,
        }));
      }
    }
  } catch {
    // Offline fallback
  }
  return [];
}

export interface OfficerDto {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  shift: string;
  area: string;
  phone: string;
  avatarUri: string;
  statusText: 'Aktif Bertugas' | 'Istirahat';
  completionRate: number;
}

/**
 * Mengambil seluruh daftar petugas lapangan dari tabel Officers di Microsoft SQL Server
 */
export async function fetchOfficersApi(): Promise<OfficerDto[] | null> {
  try {
    const base = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/officers`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch {
    // Offline fallback
  }
  return null;
}

/**
 * Mendaftarkan petugas baru (ID PTG-xxx auto-generate) atau menyimpan perubahan profil petugas ke Microsoft SQL Server
 */
export async function saveOfficerApi(
  officer: Partial<OfficerDto>
): Promise<{ success: boolean; data?: OfficerDto; error?: string }> {
  try {
    const base = await getServerUrl();
    const res = await fetch(`${base}/api/officers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(officer),
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, error: e.message || 'Gagal terhubung ke SQL Server' };
  }
}

