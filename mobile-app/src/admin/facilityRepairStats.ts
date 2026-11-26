import { Asset, Task } from '../types';
import { DamageReportDto } from '../api';

export interface FacilityRepairHistoryItem {
  id: string;
  title: string;
  date: string;
  officer: string;
  source: 'Laporan Kerusakan' | 'Work Order';
}

export interface FacilityRepairStat {
  assetCode: string;
  assetName: string;
  location: string;
  replacedCount: number;
  activeDamageCount: number;
  totalMaintenanceDone: number;
  history: FacilityRepairHistoryItem[];
}

const REPAIR_KEYWORDS = [
  'rusak',
  'kerusakan',
  'perbaik',
  'ganti',
  'penggantian',
  'bocor',
  'pecah',
  'patah',
  'mati',
  'mampet',
  'tersumbat',
  'retak',
  'konslet',
  'service',
  'servis',
];

function isRepairTask(task: Task): boolean {
  if (typeof task.physicalConditionPercentage === 'number' && task.physicalConditionPercentage < 85) {
    return true;
  }
  const haystack = `${task.judul || ''} ${task.deskripsi || ''} ${task.catatan || ''} ${task.aiStatus || ''}`.toLowerCase();
  return REPAIR_KEYWORDS.some(k => haystack.includes(k));
}

function matchesAsset(asset: Asset, code?: string, title?: string, location?: string): boolean {
  const aCode = (asset.code || '').toLowerCase().trim();
  const aName = (asset.name || '').toLowerCase().trim();
  if (code && aCode && code.toLowerCase().trim() === aCode) return true;
  const hay = `${title || ''} ${location || ''}`.toLowerCase();
  if (aCode && hay.includes(aCode)) return true;
  if (aName && aName.length >= 4 && hay.includes(aName)) return true;
  return false;
}

export function computeFacilityRepairStats(
  assets: Asset[],
  tasks: Task[],
  reports: DamageReportDto[]
): Record<string, FacilityRepairStat> {
  const result: Record<string, FacilityRepairStat> = {};

  for (const asset of assets) {
    const matchedReports = reports.filter(r =>
      matchesAsset(asset, undefined, r.judul, r.lokasi)
    );
    const completedReports = matchedReports.filter(r => r.status === 'Selesai');
    const activeReports = matchedReports.filter(
      r => r.status !== 'Selesai' && r.status !== 'Ditolak'
    );

    const matchedTasks = tasks.filter(t =>
      matchesAsset(asset, t.assetCode, t.judul, t.lokasi)
    );
    const completedTasks = matchedTasks.filter(t => t.status === 'Selesai');
    const completedRepairTasks = completedTasks.filter(isRepairTask);

    const history: FacilityRepairHistoryItem[] = [
      ...completedReports.map(r => ({
        id: r.id,
        title: r.judul,
        date: r.tanggal || '-',
        officer: r.pelapor || 'Petugas',
        source: 'Laporan Kerusakan' as const,
      })),
      ...completedRepairTasks.map(t => ({
        id: t.id,
        title: t.judul,
        date: t.completedAt || t.tenggat || '-',
        officer: t.petugas || 'Petugas',
        source: 'Work Order' as const,
      })),
    ];

    result[asset.code] = {
      assetCode: asset.code,
      assetName: asset.name,
      location: asset.location,
      replacedCount: completedReports.length + completedRepairTasks.length,
      activeDamageCount: activeReports.length,
      totalMaintenanceDone: completedTasks.length,
      history,
    };
  }

  return result;
}
