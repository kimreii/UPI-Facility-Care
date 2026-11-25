import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Task, TaskPriority } from '../types';
import { chartStyles } from './adminStyles';

export type AdminTab = 'dashboard' | 'assets' | 'calendar' | 'workorders' | 'reports';

export const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { key: 'assets', label: 'Daftar Aset', icon: '📋' },
  { key: 'calendar', label: 'Kalender', icon: '📅' },
  { key: 'workorders', label: 'Work Order', icon: '💼' },
  { key: 'reports', label: 'Laporan', icon: '📄' },
];

export const LOKASI_OPTIONS = [
  'Toilet Gedung A Lantai 2',
  'Ruang Kuliah Teori 101',
  'Lab IOT',
  'Perpustakaan Pusat Kampus',
  'Toilet Pria Lantai 1',
  'Ruang Seminar 204',
  'Halaman Kampus Barat',
];
export const PETUGAS_OPTIONS = ['Rian (Petugas)', 'Petugas 1', 'Petugas 2', 'Petugas 3'];
export const PRIORITAS_OPTIONS: TaskPriority[] = ['Normal', 'Tinggi', 'Darurat'];

const REPORT_PIPE_IMG = require('../../assets/reports/report_pipe.png');
const REPORT_SINK_IMG = require('../../assets/reports/report_sink.png');
const REPORT_TOILET_IMG = require('../../assets/reports/report_toilet.png');
const REPORT_CORRIDOR_IMG = {
  uri: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&auto=format&fit=crop&q=80',
};

export interface IncomingReport {
  id: string;
  title: string;
  reporter: string;
  date: string;
  time: string;
  urgency: 'Mendesak' | 'Tinggi' | 'Sedang';
  image: any;
  facility?: string;
  location: string;
  description: string;
  cleanlinessPercentage?: number;
  dirtinessPercentage?: number;
  physicalConditionPercentage?: number;
}

export const INITIAL_INCOMING_REPORTS: IncomingReport[] = [
  {
    id: 'REP-001',
    title: 'Kebocoran Pipa Toilet Gedung A',
    reporter: 'Rian (Petugas)',
    date: '01 Sep 2026',
    time: '09.30',
    urgency: 'Mendesak',
    image: REPORT_PIPE_IMG,
    facility: 'Pompa Air Gedung A',
    location: 'Lt.1 - Gedung A',
    description:
      'Pipa bawah wastafel mengalami rembesan air dan perlu peninjauan segera. Mohon segera ditinjau dan dibuatkan work order.',
    cleanlinessPercentage: 65,
    dirtinessPercentage: 35,
    physicalConditionPercentage: 70,
  },
  {
    id: 'REP-002',
    title: 'Keran Air Toilet Gedung A',
    reporter: 'Ali (Petugas)',
    date: '28 Sep 2026',
    time: '16.00',
    urgency: 'Mendesak',
    image: REPORT_SINK_IMG,
    facility: 'Keran Wastafel Gedung A',
    location: 'Lt.1 - Gedung A',
    description:
      'Keran air wastafel tidak bisa ditutup rapat sehingga air terus mengalir dan terbuang.',
    cleanlinessPercentage: 72,
    dirtinessPercentage: 28,
    physicalConditionPercentage: 68,
  },
  {
    id: 'REP-003',
    title: 'Koridor Gedung A',
    reporter: 'Mees (Petugas)',
    date: '01 Sep 2026',
    time: '08.00',
    urgency: 'Tinggi',
    image: REPORT_CORRIDOR_IMG,
    facility: 'Selasar Gedung A',
    location: 'Lt.1 - Gedung A',
    description:
      'Penerangan koridor dan kebersihan area selasar gedung A perlu pemeliharaan lebih lanjut.',
    cleanlinessPercentage: 80,
    dirtinessPercentage: 20,
    physicalConditionPercentage: 78,
  },
  {
    id: 'REP-004',
    title: 'Toilet Gedung A',
    reporter: 'Ragnar (Petugas)',
    date: '10 Okt 2026',
    time: '09.00',
    urgency: 'Sedang',
    image: REPORT_TOILET_IMG,
    facility: 'Kloset Duduk Gedung A',
    location: 'Lt.2 - Gedung A',
    description:
      'Kloset duduk mengalami penyumbatan ringan dan debit air bilas mengecil.',
    cleanlinessPercentage: 85,
    dirtinessPercentage: 15,
    physicalConditionPercentage: 90,
  },
];

export const MaintenanceDonutChart = ({
  centerTotal = 0,
  selesaiCount = 0,
  prosesCount = 0,
  belumCount = 0,
  perluTinjauCount = 0,
  onPressLegend,
}: {
  centerTotal?: number;
  selesaiCount?: number;
  prosesCount?: number;
  belumCount?: number;
  perluTinjauCount?: number;
  onPressLegend?: (type: 'selesai' | 'belum' | 'proses' | 'tinjau') => void;
}) => {
  const size = 170;
  const strokeWidth = 28;
  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const totalSegments = selesaiCount + prosesCount + belumCount + perluTinjauCount;
  const selesaiRatio = totalSegments > 0 ? selesaiCount / totalSegments : 0.25;
  const prosesRatio = totalSegments > 0 ? prosesCount / totalSegments : 0.25;
  const belumRatio = totalSegments > 0 ? belumCount / totalSegments : 0.25;
  const perluTinjauRatio = totalSegments > 0 ? perluTinjauCount / totalSegments : 0.25;

  const sLength = selesaiRatio * circumference;
  const pLength = prosesRatio * circumference;
  const bLength = belumRatio * circumference;
  const rLength = perluTinjauRatio * circumference;

  let offset = 0;
  const sOffset = offset;
  offset += sLength;
  const pOffset = offset;
  offset += pLength;
  const bOffset = offset;
  offset += bLength;
  const rOffset = offset;

  return (
    <View style={chartStyles.container}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${sLength} ${circumference - sLength}`}
              strokeDashoffset={-sOffset}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke="#FBBF24"
              strokeWidth={strokeWidth}
              strokeDasharray={`${pLength} ${circumference - pLength}`}
              strokeDashoffset={-pOffset}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke="#38BDF8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${bLength} ${circumference - bLength}`}
              strokeDashoffset={-bOffset}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke="#EF4444"
              strokeWidth={strokeWidth}
              strokeDasharray={`${rLength} ${circumference - rLength}`}
              strokeDashoffset={-rOffset}
              fill="transparent"
            />
          </G>
        </Svg>

        <View style={chartStyles.centerTextWrapper}>
          <Text style={chartStyles.centerNumber}>{centerTotal}</Text>
        </View>
      </View>

      <View style={chartStyles.legendGrid}>
        <TouchableOpacity
          style={chartStyles.legendItem}
          onPress={() => onPressLegend?.('selesai')}
          activeOpacity={0.7}
        >
          <View style={[chartStyles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={chartStyles.legendText}>Sudah Selesai ({selesaiCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={chartStyles.legendItem}
          onPress={() => onPressLegend?.('belum')}
          activeOpacity={0.7}
        >
          <View style={[chartStyles.legendDot, { backgroundColor: '#38BDF8' }]} />
          <Text style={chartStyles.legendText}>Belum Dimulai ({belumCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={chartStyles.legendItem}
          onPress={() => onPressLegend?.('proses')}
          activeOpacity={0.7}
        >
          <View style={[chartStyles.legendDot, { backgroundColor: '#FBBF24' }]} />
          <Text style={chartStyles.legendText}>Dalam Proses ({prosesCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={chartStyles.legendItem}
          onPress={() => onPressLegend?.('tinjau')}
          activeOpacity={0.7}
        >
          <View style={[chartStyles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={chartStyles.legendText}>Perlu Peninjauan ({perluTinjauCount})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ToiletVectorIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4C5 2.89543 5.89543 2 7 2H11C12.1046 2 13 2.89543 13 4V10H5V4Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10H5Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 17V21H14V17"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M8 21H16" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const NavHomeIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25L12 3L21 10.25V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10.25Z"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const NavClipboardIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="4"
      width="14"
      height="17"
      rx="2"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
    />
    <Path
      d="M9 2H15V5H9V2Z"
      fill={active ? '#111827' : '#6B7280'}
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <Path
      d="M8.5 10H15.5M8.5 14H13.5"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const NavCalendarIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="5"
      width="18"
      height="16"
      rx="2.5"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M3 9.5H21" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" />
    <Path
      d="M8 2.5V5.5M16 2.5V5.5"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Circle cx="8" cy="13.5" r="1.1" fill={active ? '#111827' : '#6B7280'} />
    <Circle cx="12" cy="13.5" r="1.1" fill={active ? '#111827' : '#6B7280'} />
    <Circle cx="16" cy="13.5" r="1.1" fill={active ? '#111827' : '#6B7280'} />
    <Circle cx="8" cy="17" r="1.1" fill={active ? '#111827' : '#6B7280'} />
    <Circle cx="12" cy="17" r="1.1" fill={active ? '#111827' : '#6B7280'} />
    <Circle cx="16" cy="17" r="1.1" fill={active ? '#111827' : '#6B7280'} />
  </Svg>
);

export const NavBriefcaseIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="7"
      width="18"
      height="14"
      rx="2"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 7V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M3 12H21" stroke={active ? '#111827' : '#6B7280'} strokeWidth="2" />
    <Path
      d="M10 12V14.5H14V12"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const NavReportIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2.5H6C4.89543 2.5 4 3.39543 4 4.5V19.5C4 20.6046 4.89543 21.5 6 21.5H18C19.1046 21.5 20 20.6046 20 19.5V8.5L14 2.5Z"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2.5V8.5H20"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 12.5H15M8 16H12"
      stroke={active ? '#111827' : '#6B7280'}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const DoorVectorIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 21V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V21"
      stroke="#111827"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M3 21H21" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <Rect x="7" y="6" width="9" height="15" fill="#111827" rx="1" />
    <Circle cx="13.5" cy="13.5" r="1.1" fill="#FFFFFF" />
  </Svg>
);

export const BuildingVectorIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="3"
      width="14"
      height="18"
      rx="1.5"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect x="8" y="6" width="2.5" height="2.5" fill="#111827" rx="0.5" />
    <Rect x="13.5" y="6" width="2.5" height="2.5" fill="#111827" rx="0.5" />
    <Rect x="8" y="10" width="2.5" height="2.5" fill="#111827" rx="0.5" />
    <Rect x="13.5" y="10" width="2.5" height="2.5" fill="#111827" rx="0.5" />
    <Path d="M10 21V16H14V21" fill="#111827" />
    <Path d="M3 21H21" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const LibraryVectorIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4H7.5C8.05228 4 8.5 4.44772 8.5 5V19C8.5 19.5523 8.05228 20 7.5 20H5C4.44772 20 4 19.5523 4 19V5C4 4.44772 4.44772 4 5 4Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 4H13C13.5523 4 14 4.44772 14 5V19C14 19.5523 13.5523 20 13 20H10.5C9.94772 20 9.5 19.5523 9.5 19V5C9.5 4.44772 9.94772 4 10.5 4Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 5.5L18.5 4.5C19.0228 4.3257 19.5886 4.6085 19.7629 5.1313L21.3347 11.3468C21.509 11.8696 21.2262 12.4354 20.7034 12.6097L18.2034 13.6097C17.6806 13.784 17.1148 13.5012 16.9405 12.9784L15.3687 6.7629C15.1944 6.2401 15.4772 5.6743 16 5.5Z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const renderFacilityIcon = (category?: string, name?: string) => {
  const lower = ((category || '') + ' ' + (name || '')).toLowerCase();
  if (lower.includes('toilet') || lower.includes('kamar mandi') || lower.includes('wc')) {
    return <ToiletVectorIcon />;
  }
  if (lower.includes('ballroom') || lower.includes('aula') || lower.includes('auditorium')) {
    return <DoorVectorIcon />;
  }
  if (lower.includes('perpus') || lower.includes('buku') || lower.includes('library')) {
    return <LibraryVectorIcon />;
  }
  return <BuildingVectorIcon />;
};

export interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  hasDot?: string;
  dots?: string[];
}

export const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const YEARS_LIST = [2024, 2025, 2026, 2027];

export function getTaskStatusColor(t: Task): string {
  if (t.status === 'Selesai') return '#10B981';
  if (t.status === 'Diproses') return '#FBBF24';
  if (t.prioritas === 'Darurat' || t.prioritas === 'Tinggi') return '#EF4444';
  return '#38BDF8';
}

export function resolveTaskCalendarYMD(
  t: Task,
  idx: number,
  now: Date = new Date()
): { year: number; monthIdx: number; day: number } | null {
  const raw = (t.tenggat || '').trim();
  const isLegacySeed =
    !raw ||
    raw.startsWith('2026-09') ||
    raw.startsWith('2026-10') ||
    raw.includes('Sep 2026') ||
    raw.includes('Okt 2026');

  if (raw.toLowerCase().includes('hari ini')) {
    return { year: now.getFullYear(), monthIdx: now.getMonth(), day: now.getDate() };
  }

  if (isLegacySeed) {
    const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const offsets = [0, -2, 2, -5, 4, -8, 6];
    const targetDay = Math.max(
      1,
      Math.min(daysInThisMonth, now.getDate() + offsets[idx % offsets.length])
    );
    return { year: now.getFullYear(), monthIdx: now.getMonth(), day: targetDay };
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      monthIdx: parseInt(isoMatch[2], 10) - 1,
      day: parseInt(isoMatch[3], 10),
    };
  }

  const idMatch = raw.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (idMatch) {
    const mIdx = MONTHS_LIST.findIndex(m => m.toLowerCase() === idMatch[2].toLowerCase());
    if (mIdx >= 0) {
      return {
        year: parseInt(idMatch[3], 10),
        monthIdx: mIdx,
        day: parseInt(idMatch[1], 10),
      };
    }
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      monthIdx: parsed.getMonth(),
      day: parsed.getDate(),
    };
  }

  return null;
}

export function buildRealtimeCalendarGrid(
  monthShort: string,
  year: number,
  tasks: Task[] = []
): (CalendarCell | null)[] {
  const monthIdx = Math.max(0, MONTHS_LIST.indexOf(monthShort));
  const firstDayOfWeek = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const now = new Date();

  const dotMap: Record<number, string[]> = {};
  tasks.forEach((t, idx) => {
    const ymd = resolveTaskCalendarYMD(t, idx, now);
    if (!ymd || ymd.year !== year || ymd.monthIdx !== monthIdx) return;

    const color = getTaskStatusColor(t);
    if (!dotMap[ymd.day]) dotMap[ymd.day] = [];
    if (!dotMap[ymd.day].includes(color)) {
      dotMap[ymd.day].push(color);
    }
  });

  const cells: (CalendarCell | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dots = dotMap[d];
    cells.push({
      day: d,
      isCurrentMonth: true,
      hasDot: dots?.[0],
      dots,
    });
  }
  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      day: nextMonthDay++,
      isCurrentMonth: false,
    });
  }
  return cells;
}

export const CALENDAR_GRID_SEP: (CalendarCell | null)[] = [
  null,
  { day: 1, isCurrentMonth: true },
  { day: 2, isCurrentMonth: true },
  { day: 3, isCurrentMonth: true },
  { day: 4, isCurrentMonth: true },
  { day: 5, isCurrentMonth: true },
  { day: 6, isCurrentMonth: true, hasDot: '#FBBF24' },

  { day: 7, isCurrentMonth: true },
  { day: 8, isCurrentMonth: true, hasDot: '#10B981' },
  { day: 9, isCurrentMonth: true },
  { day: 10, isCurrentMonth: true },
  { day: 11, isCurrentMonth: true, hasDot: '#EF4444' },
  { day: 12, isCurrentMonth: true },
  { day: 13, isCurrentMonth: true },

  { day: 14, isCurrentMonth: true },
  { day: 15, isCurrentMonth: true },
  { day: 16, isCurrentMonth: true },
  { day: 17, isCurrentMonth: true, hasDot: '#38BDF8' },
  { day: 18, isCurrentMonth: true },
  { day: 19, isCurrentMonth: true },
  { day: 20, isCurrentMonth: true },

  { day: 21, isCurrentMonth: true, hasDot: '#10B981' },
  { day: 22, isCurrentMonth: true },
  { day: 23, isCurrentMonth: true },
  { day: 24, isCurrentMonth: true },
  { day: 25, isCurrentMonth: true },
  { day: 26, isCurrentMonth: true, hasDot: '#38BDF8' },
  { day: 27, isCurrentMonth: true },

  { day: 28, isCurrentMonth: true },
  { day: 29, isCurrentMonth: true },
  { day: 30, isCurrentMonth: true },
  { day: 1, isCurrentMonth: false },
  { day: 2, isCurrentMonth: false },
  { day: 3, isCurrentMonth: false },
  { day: 4, isCurrentMonth: false },
];

export const SCHEDULED_TASKS_BY_DATE: Record<number, { time: string; title: string; location: string }[]> = {
  9: [
    { time: '06.00', title: 'Toilet Gedung A', location: 'Lantai 2' },
    { time: '08.00', title: 'Ballroom Gedung A', location: 'Lantai 5' },
    { time: '08.30', title: 'Toilet Gedung A', location: 'Lantai 1' },
  ],
  6: [
    { time: '09.00', title: 'Koridor Gedung C', location: 'Lantai 3' },
    { time: '11.00', title: 'Ruang Seminar 204', location: 'Lantai 2' },
  ],
  8: [
    { time: '07.30', title: 'Perpustakaan Pusat', location: 'Gedung A Lantai 1' },
    { time: '10.00', title: 'Toilet Pria Lantai 1', location: 'Lantai 1' },
  ],
  11: [
    { time: '13.00', title: 'Lab IOT', location: 'Gedung Teknik Lantai 2' },
    { time: '15.00', title: 'Ruang Kuliah Teori 101', location: 'Lantai 1' },
  ],
  17: [
    { time: '08.00', title: 'Koridor Prodi', location: 'Prodi Bisnis Lantai 3' },
  ],
  21: [
    { time: '07.00', title: 'Toilet Gedung A', location: 'Lantai 2' },
    { time: '10.30', title: 'Halaman Kampus Barat', location: 'Area Luar' },
  ],
  26: [
    { time: '09.00', title: 'Ballroom Gedung A', location: 'Lantai 5' },
  ],
};
