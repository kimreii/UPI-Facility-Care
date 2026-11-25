import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { Task } from '../types';
import { formatTaskDateReal, formatShortDateId } from '../dateUtils';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PetugasReport {
  id: string;
  judul: string;
  lokasi: string;
  urgensi: 'Mendesak' | 'Tinggi' | 'Sedang';
  waktu: string;
  tanggal: string;
  jam: string;
  status: 'Dalam Peninjauan' | 'Terkirim' | 'Diproses' | 'Selesai' | 'Ditolak';
  catatan: string;
  foto: string;
  kategori?: string[];
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Cek kondisi toilet', checked: false },
  { id: '2', label: 'Bersihkan 2 toilet', checked: false },
  { id: '3', label: 'Pastikan air mengalir dengan baik', checked: false },
  { id: '4', label: 'Pastikan lantai tidak kotor', checked: false },
  { id: '5', label: 'Pastikan lantai tidak licin', checked: false },
  { id: '6', label: 'Foto setelah perbaikan', checked: false },
];

export const getChecklistForTask = (task: Task): ChecklistItem[] => {
  const lower = `${task.judul} ${task.assetCode || ''}`.toLowerCase();
  if (lower.includes('koridor') || lower.includes('ast-002')) {
    return [
      { id: '1', label: 'Sapu dan pel lantai koridor', checked: false },
      { id: '2', label: 'Bersihkan kaca jendela & railing koridor', checked: false },
      { id: '3', label: 'Pastikan lampu penerangan koridor menyala', checked: false },
      { id: '4', label: 'Kosongkan tempat sampah area koridor', checked: false },
      { id: '5', label: 'Pastikan jalur koridor tidak licin & bebas hambatan', checked: false },
      { id: '6', label: 'Foto setelah perbaikan', checked: false },
    ];
  }
  if (lower.includes('pustaka') || lower.includes('ast-003')) {
    return [
      { id: '1', label: 'Bersihkan meja baca dan kursi perpustakaan', checked: false },
      { id: '2', label: 'Rapikan rak buku dan bersihkan debu permukaan', checked: false },
      { id: '3', label: 'Vacuum atau pel lantai ruang perpustakaan', checked: false },
      { id: '4', label: 'Periksa pencahayaan dan kesejukan AC ruangan', checked: false },
      { id: '5', label: 'Pastikan area bebas sampah dan tertata rapi', checked: false },
      { id: '6', label: 'Foto setelah perbaikan', checked: false },
    ];
  }
  if (lower.includes('ballroom') || lower.includes('aula') || lower.includes('ast-004')) {
    return [
      { id: '1', label: 'Vacuum karpet / pel lantai utama ballroom', checked: false },
      { id: '2', label: 'Cek kondisi pintu masuk & jalur evakuasi', checked: false },
      { id: '3', label: 'Bersihkan panggung, podium, dan deretan kursi', checked: false },
      { id: '4', label: 'Periksa lampu utama dan kelengkapan fasilitas aula', checked: false },
      { id: '5', label: 'Pastikan ruangan bersih dan siap digunakan', checked: false },
      { id: '6', label: 'Foto setelah perbaikan', checked: false },
    ];
  }
  if (lower.includes('lab')) {
    return [
      { id: '1', label: 'Bersihkan meja komputer/praktikum dan kursi lab', checked: false },
      { id: '2', label: 'Sapu dan pel lantai ruang laboratorium', checked: false },
      { id: '3', label: 'Periksa kondisi AC, lampu, dan kabel perangkat', checked: false },
      { id: '4', label: 'Kosongkan tempat sampah ruang laboratorium', checked: false },
      { id: '5', label: 'Pastikan lantai kering dan bebas debu', checked: false },
      { id: '6', label: 'Foto setelah perbaikan', checked: false },
    ];
  }
  if (
    lower.includes('ruang') ||
    lower.includes('kelas') ||
    lower.includes('teori') ||
    lower.includes('seminar') ||
    lower.includes('r-1') ||
    lower.includes('r-2')
  ) {
    return [
      { id: '1', label: 'Bersihkan papan tulis, meja dosen, dan kursi kuliah', checked: false },
      { id: '2', label: 'Sapu dan pel lantai ruang perkuliahan', checked: false },
      { id: '3', label: 'Periksa proyektor/TV, lampu, dan AC ruangan', checked: false },
      { id: '4', label: 'Kosongkan tempat sampah di dalam kelas', checked: false },
      { id: '5', label: 'Rapikan susunan kursi agar siap digunakan', checked: false },
      { id: '6', label: 'Foto setelah perbaikan', checked: false },
    ];
  }
  return DEFAULT_CHECKLIST.map(item => ({ ...item }));
};

export const getFacilityMetadata = (task: Task) => {
  const lower = `${task.judul} ${task.assetCode || ''}`.toLowerCase();
  const floorMatch =
    task.lokasi?.match(/Lt\.?\s*\d+/i)?.[0] ||
    task.lokasi?.match(/Lantai\s*\d+/i)?.[0] ||
    'Lt.1';
  const assetCode = task.assetCode || 'AST-001';
  const qrNumber = assetCode.replace(/[^0-9]/g, '') || '001';
  const qrCode = assetCode.startsWith('AST-') ? `QR-${qrNumber.padStart(3, '0')}` : `QR-${assetCode}`;
  const realDateStr = formatTaskDateReal(task.tenggat);
  const timeMatch = task.tenggat?.match(/(\d{2}[.:]\d{2})/)?.[1]?.replace('.', ':');

  if (lower.includes('koridor')) {
    return {
      jenis: 'Koridor Gedung',
      shortSubtitle: `Koridor • ${floorMatch}`,
      jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '09:00'}`,
      assetCode,
      qrCode,
    };
  }
  if (lower.includes('pustaka')) {
    return {
      jenis: 'Ruang Perpustakaan',
      shortSubtitle: `Perpustakaan • ${floorMatch}`,
      jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '10:00'}`,
      assetCode,
      qrCode,
    };
  }
  if (lower.includes('ballroom') || lower.includes('aula')) {
    return {
      jenis: 'Ballroom / Aula',
      shortSubtitle: `Ballroom • ${floorMatch}`,
      jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '13:00'}`,
      assetCode,
      qrCode,
    };
  }
  if (lower.includes('lab')) {
    return {
      jenis: 'Laboratorium',
      shortSubtitle: `Laboratorium • ${floorMatch}`,
      jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '09:00'}`,
      assetCode,
      qrCode,
    };
  }
  if (
    lower.includes('ruang') ||
    lower.includes('kelas') ||
    lower.includes('teori') ||
    lower.includes('seminar')
  ) {
    return {
      jenis: 'Ruang Perkuliahan',
      shortSubtitle: `Ruang Kelas • ${floorMatch}`,
      jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '08:30'}`,
      assetCode,
      qrCode,
    };
  }
  return {
    jenis: 'Kamar Mandi',
    shortSubtitle: `Toilet • ${floorMatch}`,
    jadwal: `Jadwal: ${realDateStr} • ${timeMatch || '08:00'}`,
    assetCode,
    qrCode,
  };
};

export const INITIAL_PETUGAS_TASKS: Task[] = [
  {
    id: 'WO-001',
    judul: 'Toilet Gedung A Lantai 1',
    lokasi: 'Lt.1 - Gedung A',
    prioritas: 'Normal',
    status: 'Diproses',
    petugas: 'Rian (Petugas)',
    tenggat: 'Hari ini, 08.00',
    deskripsi: 'Pemeriksaan dan pembersihan rutin fasilitas toilet lantai 1 gedung.',
    assetCode: 'AST-001',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-002',
    judul: 'Koridor Gedung A Lantai 3',
    lokasi: 'Lt.3 - Gedung A',
    prioritas: 'Tinggi',
    status: 'Menunggu',
    petugas: 'Rian (Petugas)',
    tenggat: 'Hari ini, 09.00',
    deskripsi: 'Pembersihan koridor lantai 3.',
    assetCode: 'AST-002',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-003',
    judul: 'Perpustakaan Lantai 1',
    lokasi: 'Lt.1 - Gedung Perpustakaan',
    prioritas: 'Tinggi',
    status: 'Menunggu',
    petugas: 'Rian (Petugas)',
    tenggat: 'Hari ini, 10.00',
    deskripsi: 'Pembersihan area perpustakaan.',
    assetCode: 'AST-003',
    catatan: '',
    foto: '',
  },
  {
    id: 'WO-004',
    judul: 'Ballroom Gedung A Lantai 5',
    lokasi: 'Lt.5 - Gedung A',
    prioritas: 'Tinggi',
    status: 'Menunggu',
    petugas: 'Rian (Petugas)',
    tenggat: 'Hari ini, 13.00',
    deskripsi: 'Pembersihan ballroom lantai 5.',
    assetCode: 'AST-004',
    catatan: '',
    foto: '',
  },
];

export const INITIAL_PETUGAS_REPORTS: PetugasReport[] = [
  {
    id: 'REP-001',
    judul: 'Kebocoran Pipa Toilet Gedung A',
    lokasi: 'Lt.1 - Gedung A',
    urgensi: 'Mendesak',
    waktu: '01 Sep 2026 • 09:30',
    tanggal: '01 Sep 2026',
    jam: '09:30',
    status: 'Dalam Peninjauan',
    catatan: 'Pipa bawah wastafel mengalami rembesan air dan perlu peninjauan segera.',
    foto: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&auto=format&fit=crop&q=80',
    kategori: ['Butuh peninjauan segera', 'Kerusakan total'],
  },
  {
    id: 'REP-002',
    judul: 'Keran Air Toilet Gedung A',
    lokasi: 'Lt.1 - Gedung A',
    urgensi: 'Mendesak',
    waktu: '28 Sep 2026 • 16:00',
    tanggal: '28 Sep 2026',
    jam: '16:00',
    status: 'Dalam Peninjauan',
    catatan: 'Keran wastafel longgar dan air menetes terus menerus.',
    foto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
    kategori: ['Butuh peninjauan segera'],
  },
  {
    id: 'REP-003',
    judul: 'Koridor Gedung A',
    lokasi: 'Lt.1 - Gedung A',
    urgensi: 'Tinggi',
    waktu: '01 Sep 2026 • 08:00',
    tanggal: '01 Sep 2026',
    jam: '08:00',
    status: 'Dalam Peninjauan',
    catatan: 'Penerangan koridor dan kebersihan area selasar gedung A.',
    foto: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&auto=format&fit=crop&q=80',
    kategori: ['Perlu pemeliharaan lebih lanjut'],
  },
];

export const ToiletVectorIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Rect
      x="7"
      y="3"
      width="10"
      height="6"
      rx="1.5"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 9H19V13.5C19 16.5376 16.5376 19 13.5 19H10.5C7.46243 19 5 16.5376 5 13.5V9Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.5 19V21.5H15.5V19"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M7 21.5H17" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const BuildingVectorIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="2" width="16" height="20" rx="2" stroke="#111827" strokeWidth="1.8" />
    <Rect x="7" y="6" width="3" height="3" rx="0.5" fill="#111827" />
    <Rect x="14" y="6" width="3" height="3" rx="0.5" fill="#111827" />
    <Rect x="7" y="11" width="3" height="3" rx="0.5" fill="#111827" />
    <Rect x="14" y="11" width="3" height="3" rx="0.5" fill="#111827" />
    <Rect x="10" y="16.5" width="4" height="5.5" rx="0.5" fill="#111827" />
  </Svg>
);

export const BooksVectorIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="4.5" height="16" rx="1" stroke="#111827" strokeWidth="1.8" />
    <Rect x="10" y="4" width="4.5" height="16" rx="1" stroke="#111827" strokeWidth="1.8" />
    <Path d="M16 6L20 4.5V19.5L16 20V6Z" stroke="#111827" strokeWidth="1.8" strokeLinejoin="round" />
  </Svg>
);

export const DoorVectorIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#111827" strokeWidth="1.8" />
    <Path d="M11 3V21" stroke="#111827" strokeWidth="1.8" />
    <Circle cx="8" cy="12" r="1.5" fill="#111827" />
  </Svg>
);

export const TaskFacilityIcon = ({ judul }: { judul: string }) => {
  const lower = judul.toLowerCase();
  if (lower.includes('toilet') || lower.includes('kamar mandi')) {
    return <ToiletVectorIcon />;
  }
  if (lower.includes('koridor') || lower.includes('gedung a')) {
    return <BuildingVectorIcon />;
  }
  if (lower.includes('pustaka') || lower.includes('buku')) {
    return <BooksVectorIcon />;
  }
  if (lower.includes('ballroom') || lower.includes('pintu') || lower.includes('aula')) {
    return <DoorVectorIcon />;
  }
  return <BuildingVectorIcon />;
};

export const NavTugasIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="4" width="14" height="17" rx="2" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" />
    <Path
      d="M9 2H15V5H9V2Z"
      fill={active ? '#111827' : '#6B7280'}
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <Line x1="8.5" y1="10" x2="15.5" y2="10" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" strokeLinecap="round" />
    <Line x1="8.5" y1="14" x2="13.5" y2="14" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const NavQrIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8V5C4 4.44772 4.44772 4 5 4H8" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M16 4H19C19.5523 4 20 4.44772 20 5V8" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M20 16V19C20 19.5523 19.5523 20 19 20H16" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M8 20H5C4.44772 20 4 19.5523 4 19V16" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" stroke="#111827" strokeWidth="2" />
  </Svg>
);

export const NavPelaporanIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path d="M14 2V8H20" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="14" y2="13" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" strokeLinecap="round" />
    <Line x1="8" y1="17" x2="16" y2="17" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const BellNotificationIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="#111827"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="#111827"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
