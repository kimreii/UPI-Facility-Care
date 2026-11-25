import { useState, useEffect } from 'react';

export const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export const BULAN_PENUH_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const BULAN_SINGKAT_INDONESIA = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatFullDateId(date: Date = new Date()): string {
  const hari = HARI_INDONESIA[date.getDay()];
  const tgl = String(date.getDate()).padStart(2, '0');
  const bulan = BULAN_PENUH_INDONESIA[date.getMonth()];
  const tahun = date.getFullYear();
  return `${hari}, ${tgl} ${bulan} ${tahun}`;
}

export function formatShortDateId(date: Date = new Date()): string {
  const tgl = String(date.getDate()).padStart(2, '0');
  const bulan = BULAN_SINGKAT_INDONESIA[date.getMonth()];
  const tahun = date.getFullYear();
  return `${tgl} ${bulan} ${tahun}`;
}

export function formatTimeId(date: Date = new Date(), separator: ':' | '.' = ':'): string {
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  return `${jam}${separator}${menit}`;
}

export function formatIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getGreetingId(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'Selamat Pagi';
  if (h >= 11 && h < 15) return 'Selamat Siang';
  if (h >= 15 && h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function formatTaskDateReal(dateStr?: string, now: Date = new Date()): string {
  if (
    !dateStr ||
    dateStr.toLowerCase().includes('hari ini') ||
    dateStr.startsWith('2026-09') ||
    dateStr.startsWith('2026-10') ||
    dateStr.includes('Sep 2026') ||
    dateStr.includes('Okt 2026')
  ) {
    return formatShortDateId(now);
  }
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${BULAN_SINGKAT_INDONESIA[monthIdx]} ${year}`;
    }
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return formatShortDateId(parsed);
  }
  return dateStr;
}

export type DashboardPeriod = 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini';

/**
 * Tanggal efektif sebuah tugas / laporan, KONSISTEN dengan yang ditampilkan formatTaskDateReal:
 * 'Hari ini' / data contoh Sep-Okt 2026 / kosong => dianggap hari ini,
 * format ISO (2026-11-24) dan 'DD Mon YYYY' => tanggal aslinya.
 */
export function parseEffectiveDate(dateStr?: string, now: Date = new Date()): Date {
  if (
    !dateStr ||
    dateStr.toLowerCase().includes('hari ini') ||
    dateStr.startsWith('2026-09') ||
    dateStr.startsWith('2026-10') ||
    dateStr.includes('Sep 2026') ||
    dateStr.includes('Okt 2026')
  ) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
  }
  const idFmt = dateStr.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (idFmt) {
    const monthIdx = BULAN_SINGKAT_INDONESIA.findIndex(
      m => m.toLowerCase() === idFmt[2].toLowerCase()
    );
    if (monthIdx >= 0) {
      return new Date(parseInt(idFmt[3], 10), monthIdx, parseInt(idFmt[1], 10));
    }
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Rentang [start, end] (inklusif, jam 00:00) untuk periode saat ini atau periode sebelumnya. */
export function getPeriodRange(
  period: DashboardPeriod,
  now: Date = new Date(),
  previous: boolean = false
): { start: Date; end: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'Hari Ini') {
    const d = new Date(today);
    if (previous) d.setDate(d.getDate() - 1);
    return { start: d, end: new Date(d) };
  }
  if (period === 'Minggu Ini') {
    const dow = (today.getDay() + 6) % 7; // Senin = 0
    const start = new Date(today);
    start.setDate(start.getDate() - dow - (previous ? 7 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  const monthOffset = previous ? -1 : 0;
  const start = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
  return { start, end };
}

export function isDateInRange(date: Date, range: { start: Date; end: Date }): boolean {
  return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
}

export function describePeriodRange(period: DashboardPeriod, now: Date = new Date()): string {
  const { start, end } = getPeriodRange(period, now);
  if (period === 'Hari Ini') return formatFullDateId(start);
  if (period === 'Bulan Ini') {
    return `${BULAN_PENUH_INDONESIA[start.getMonth()]} ${start.getFullYear()}`;
  }
  const fmt = (d: Date) => `${d.getDate()} ${BULAN_SINGKAT_INDONESIA[d.getMonth()]}`;
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export function useRealtimeClock(intervalMs: number = 15000) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return {
    now,
    fullDateStr: formatFullDateId(now),
    shortDateStr: formatShortDateId(now),
    timeColon: formatTimeId(now, ':'),
    timeDot: formatTimeId(now, '.'),
    greeting: getGreetingId(now),
    isoDateStr: formatIsoDate(now),
  };
}
