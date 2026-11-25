import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Asset } from './types';

const STORAGE_KEY = 'upiFacilityCareTasks_v1';
const ASSETS_STORAGE_KEY = 'upiFacilityCareAssets_v1';

export const initialTasks: Task[] = [
  {
    id: 'WO-001',
    assetCode: 'AST-001',
    judul: 'Toilet Gedung A',
    lokasi: 'Lantai 2',
    petugas: 'Petugas 1',
    prioritas: 'Normal',
    tenggat: '2026-09-01',
    deskripsi: 'Pembersihan toilet rutin.',
    status: 'Menunggu',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-002',
    assetCode: 'AST-004',
    judul: 'Koridor Gedung A',
    lokasi: 'Lantai 3',
    petugas: 'Petugas 2',
    prioritas: 'Tinggi',
    tenggat: '2026-09-01',
    deskripsi: 'Pembersihan koridor lantai 3.',
    status: 'Diproses',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-003',
    assetCode: 'AST-003',
    judul: 'Toilet Gedung A',
    lokasi: 'Lantai 3',
    petugas: 'Petugas 1',
    prioritas: 'Normal',
    tenggat: '2026-09-01',
    deskripsi: 'Pembersihan toilet lantai 3.',
    status: 'Selesai',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-004',
    assetCode: 'AST-002',
    judul: 'Ballroom',
    lokasi: 'Lantai 5',
    petugas: 'Petugas 3',
    prioritas: 'Normal',
    tenggat: '2026-09-01',
    deskripsi: 'Pembersihan ballroom lantai 5.',
    status: 'Menunggu',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-005',
    assetCode: 'AST-005',
    judul: 'Perpustakaan',
    lokasi: 'Lantai 1',
    petugas: 'Petugas 1',
    prioritas: 'Normal',
    tenggat: '2026-09-01',
    deskripsi: 'Pembersihan area perpustakaan.',
    status: 'Menunggu',
    catatan: '',
    foto: '',
  },
];

export const initialAssets: Asset[] = [
  {
    code: 'AST-001',
    name: 'Toilet Gedung A',
    location: 'Lantai 2',
    building: 'Gedung A',
    category: 'Toilet',
    condition: 'Baik',
    status: 'Aktif',
    floor: 2,
    lastCleaned: '2026-10-27',
  },
  {
    code: 'AST-002',
    name: 'Ballroom Gedung A',
    location: 'Lantai 5',
    building: 'Gedung A',
    category: 'Ballroom',
    condition: 'Baik',
    status: 'Tutup',
    floor: 5,
    lastCleaned: '2026-10-27',
  },
  {
    code: 'AST-003',
    name: 'Toilet Gedung A',
    location: 'Lantai 1',
    building: 'Gedung A',
    category: 'Toilet',
    condition: 'Baik',
    status: 'Aktif',
    floor: 1,
    lastCleaned: '2026-10-27',
  },
  {
    code: 'AST-004',
    name: 'Koridor Gedung C',
    location: 'Lantai 3',
    building: 'Gedung C',
    category: 'Koridor',
    condition: 'Baik',
    status: 'Aktif',
    floor: 3,
    lastCleaned: '2026-10-27',
  },
  {
    code: 'AST-005',
    name: 'Perpustakaan',
    location: 'Gedung A Lantai 1',
    building: 'Gedung A',
    category: 'Perpustakaan',
    condition: 'Baik',
    status: 'Aktif',
    floor: 1,
    lastCleaned: '2026-10-27',
  },
  {
    code: 'AST-006',
    name: 'Koridor Prodi',
    location: 'Prodi Bisnis Lantai 3',
    building: 'Prodi Bisnis',
    category: 'Koridor',
    condition: 'Baik',
    status: 'Aktif',
    floor: 3,
    lastCleaned: '2026-10-27',
  },
];

export async function loadTasks(): Promise<Task[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [...initialTasks];
    }
  } catch (e) {
    console.error('Gagal membaca data tasks:', e);
  }
  return initialTasks.map(t => ({ ...t }));
}

export async function saveTasks(tasks: Task[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (e) {
    console.error('Gagal simpan data tasks:', e);
    return false;
  }
}

export async function loadAssets(): Promise<Asset[]> {
  try {
    const saved = await AsyncStorage.getItem(ASSETS_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [...initialAssets];
    }
  } catch (e) {
    console.error('Gagal membaca data assets:', e);
  }
  return initialAssets.map(a => ({ ...a }));
}

export async function saveAssets(assets: Asset[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    return true;
  } catch (e) {
    console.error('Gagal simpan data assets:', e);
    return false;
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getStats(tasks: Task[]) {
  return {
    total: tasks.length,
    menunggu: tasks.filter(t => t.status === 'Menunggu').length,
    proses: tasks.filter(t => t.status === 'Diproses').length,
    selesai: tasks.filter(t => t.status === 'Selesai').length,
  };
}
