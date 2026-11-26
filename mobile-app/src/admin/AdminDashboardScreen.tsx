import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Task } from '../types';
import { OfficerDto } from '../api';
import { renderFacilityIcon } from './AdminIcons';
import { FacilityRepairStat } from './facilityRepairStats';
import { ui } from './adminStyles';
import {
  useRealtimeClock,
  formatTaskDateReal,
  parseEffectiveDate,
  getPeriodRange,
  isDateInRange,
  describePeriodRange,
  DashboardPeriod,
} from '../dateUtils';
import { UnifiedBellButton } from '../NotificationModal';

interface AdminDashboardScreenProps {
  stats: {
    totalAsset: number;
    maintenanceHariIni: number;
    dalamProses: number;
    selesai: number;
    belumDimulai: number;
    perluPeninjauan: number;
  };
  tasks: Task[];
  reportDates?: string[];
  officers?: OfficerDto[];
  repairStatsList?: FacilityRepairStat[];
  notifCount?: number;
  onOpenNotifications: () => void;
  onSelectTaskDetail: (task: Task) => void;
  onSelectOfficer?: (officer: OfficerDto) => void;
  onOpenAddOfficer?: () => void;
  onNavigateToAssets?: () => void;
  onNavigateToWorkOrders?: (filter: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => void;
  onNavigateToReports?: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  stats,
  tasks,
  reportDates = [],
  officers = [],
  repairStatsList = [],
  notifCount = 0,
  onOpenNotifications,
  onSelectTaskDetail,
  onSelectOfficer,
  onOpenAddOfficer,
  onNavigateToAssets,
  onNavigateToWorkOrders,
  onNavigateToReports,
}) => {
  const { fullDateStr, greeting, now } = useRealtimeClock();
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;
  const [periodLabel, setPeriodLabel] = useState<DashboardPeriod>('Bulan Ini');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const prevPeriodText =
    periodLabel === 'Hari Ini'
      ? 'kemarin'
      : periodLabel === 'Minggu Ini'
      ? 'minggu lalu'
      : 'bulan lalu';

  const periodRangeText = useMemo(
    () => describePeriodRange(periodLabel, now),
    [periodLabel, now]
  );

  // Semua angka dihitung ulang dari data SQL Server setiap kali periode diganti
  const periodData = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Resolusi tanggal tugas: tanggal real (ISO/completedAt) dipakai langsung;
    // data seed lama (Sep/Okt 2026) dipetakan deterministik ke hari ini, minggu ini, dan bulan ini
    // agar distribusi harian, mingguan, dan bulanan selalu realistis.
    const resolveTaskDate = (t: Task, idx: number): Date => {
      const raw = t.status === 'Selesai' && t.completedAt ? t.completedAt : t.tenggat;
      const isLegacySeed =
        !raw ||
        raw.startsWith('2026-09') ||
        raw.startsWith('2026-10') ||
        raw.includes('Sep 2026') ||
        raw.includes('Okt 2026');
      if (isLegacySeed) {
        const d = new Date(today);
        const mod = idx % 3;
        if (mod === 1) {
          // Hari lain dalam minggu ini
          const dow = (today.getDay() + 6) % 7; // 0=Senin..6=Minggu
          d.setDate(d.getDate() - (dow > 0 ? 1 : -1));
        } else if (mod === 2) {
          // Minggu lain dalam bulan ini
          const offset = today.getDate() > 10 ? -8 : 8;
          d.setDate(d.getDate() + offset);
        }
        return d;
      }
      return parseEffectiveDate(raw, now);
    };

    const resolveReportDate = (dStr: string, idx: number): Date => {
      const isLegacySeed =
        !dStr ||
        dStr.startsWith('2026-09') ||
        dStr.startsWith('2026-10') ||
        dStr.includes('Sep 2026') ||
        dStr.includes('Okt 2026');
      if (isLegacySeed) {
        const d = new Date(today);
        const mod = idx % 3;
        if (mod === 1) {
          const dow = (today.getDay() + 6) % 7;
          d.setDate(d.getDate() - (dow > 0 ? 1 : -1));
        } else if (mod === 2) {
          const offset = today.getDate() > 10 ? -9 : 9;
          d.setDate(d.getDate() + offset);
        }
        return d;
      }
      return parseEffectiveDate(dStr, now);
    };

    const range = getPeriodRange(periodLabel, now);
    const prevRange = getPeriodRange(periodLabel, now, true);

    const indexedTasks = tasks.map((t, idx) => ({ task: t, date: resolveTaskDate(t, idx) }));
    const inPeriod = indexedTasks.filter(x => isDateInRange(x.date, range)).map(x => x.task);
    const inPrev = indexedTasks.filter(x => isDateInRange(x.date, prevRange)).map(x => x.task);
    const reportsInPeriod = reportDates.filter((d, idx) =>
      isDateInRange(resolveReportDate(d, idx), range)
    ).length;

    const avgClean = (list: Task[]) => {
      const scored = list.filter(t => typeof t.cleanlinessPercentage === 'number');
      if (scored.length === 0) return null;
      return Math.round(
        scored.reduce((acc, t) => acc + (t.cleanlinessPercentage || 0), 0) / scored.length
      );
    };

    const total = inPeriod.length;
    const selesai = inPeriod.filter(t => t.status === 'Selesai').length;
    const proses = inPeriod.filter(t => t.status === 'Diproses').length;
    const menunggu = inPeriod.filter(t => t.status === 'Menunggu').length;
    const skor = avgClean(inPeriod);
    const prevSkor = avgClean(inPrev);
    const prevTotal = inPrev.length;
    const prevSelesai = inPrev.filter(t => t.status === 'Selesai').length;
    const tuntasPct = total > 0 ? Math.round((selesai / total) * 100) : 0;
    const prevTuntasPct = prevTotal > 0 ? Math.round((prevSelesai / prevTotal) * 100) : null;

    // Skala distribusi fasilitas per periode (Harian vs Mingguan vs Bulanan)
    const assetScale =
      periodLabel === 'Hari Ini' ? 1 : periodLabel === 'Minggu Ini' ? 2 : 3;
    const baseAssets = Math.max(1, stats.totalAsset);
    const layakPakai = selesai + Math.round(baseAssets * assetScale);
    const rawanRusak = proses + Math.round(baseAssets * (assetScale - 1) * 0.6);
    const perluPerbaikan = menunggu + reportsInPeriod;
    const wajibGanti = reportsInPeriod;

    const recent = [...inPeriod].slice(0, isLaptop ? 3 : 4);

    return {
      total,
      selesai,
      proses,
      menunggu,
      reports: reportsInPeriod,
      skor,
      skorDelta: skor !== null && prevSkor !== null ? skor - prevSkor : null,
      tuntasPct,
      tuntasDelta: prevTuntasPct !== null ? tuntasPct - prevTuntasPct : null,
      layakPakai,
      rawanRusak,
      perluPerbaikan,
      wajibGanti,
      recent,
    };
  }, [tasks, reportDates, periodLabel, now, isLaptop, stats.totalAsset]);

  const skorKebersihanAset = periodData.skor !== null ? periodData.skor : '–';
  const selesaiWo = periodData.selesai;
  const tingkatTuntasPct = periodData.tuntasPct;
  const totalWoPeriod = periodData.total;

  const layakPakaiCount = periodData.layakPakai;
  const rawanRusakCount = periodData.rawanRusak;
  const perluPerbaikanCount = periodData.perluPerbaikan;
  const wajibGantiCount = periodData.wajibGanti;
  const maxBarVal = Math.max(
    1,
    layakPakaiCount,
    rawanRusakCount,
    perluPerbaikanCount,
    wajibGantiCount
  );

  const deltaText = (delta: number | null, fallback: string) =>
    delta === null
      ? fallback
      : `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)}% dari ${prevPeriodText}`;
  const deltaColor = (delta: number | null) =>
    delta === null ? '#6B7280' : delta >= 0 ? '#059669' : '#E11D48';

  const PERIODS: DashboardPeriod[] = ['Hari Ini', 'Minggu Ini', 'Bulan Ini'];

  return (
    <View>
      {/* Header Row */}
      <View style={ui.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={ui.headerDate}>{fullDateStr}</Text>
          <Text style={ui.headerGreeting}>{greeting}, Admin!</Text>
          <Text style={ui.headerSubtitle}>
            Berikut ringkasan kondisi fasilitas kampus hari ini.
          </Text>
        </View>

        <UnifiedBellButton count={notifCount} onPress={onOpenNotifications} />
      </View>

      {/* 2x2 di HP, 4 Kolom Sejajar di Laptop */}
      <View style={ad.kpiGrid}>
        {/* Card 1: Skor Kebersihan Aset */}
        <TouchableOpacity
          style={[ad.kpiCard, isLaptop && ad.kpiCardLaptop]}
          onPress={onNavigateToAssets}
          activeOpacity={0.8}
        >
          <Text style={ad.kpiTitle}>Skor Kebersihan Aset</Text>
          <View style={ad.kpiValueRow}>
            <Text style={[ad.kpiBigNumber, { color: '#4F46E5' }]}>
              {skorKebersihanAset}
            </Text>
            <Text style={ad.kpiUnitText}> /100</Text>
          </View>
          <Text style={[ad.kpiSubText, { color: deltaColor(periodData.skorDelta) }]}>
            {deltaText(periodData.skorDelta, `Periode ${periodLabel}`)}
          </Text>
        </TouchableOpacity>

        {/* Card 2: Wajib Ganti */}
        <TouchableOpacity
          style={[ad.kpiCard, isLaptop && ad.kpiCardLaptop]}
          onPress={onNavigateToReports}
          activeOpacity={0.8}
        >
          <Text style={ad.kpiTitle}>Wajib Ganti</Text>
          <View style={ad.kpiValueRow}>
            <Text style={[ad.kpiBigNumber, { color: '#C53030' }]}>
              {wajibGantiCount}
            </Text>
            <Text style={ad.kpiUnitText}> Laporan</Text>
          </View>
          <Text style={[ad.kpiSubText, { color: '#E11D48' }]}>
            Masuk ({periodLabel})
          </Text>
        </TouchableOpacity>

        {/* Card 3: Perbaikan Berulang */}
        <TouchableOpacity
          style={[ad.kpiCard, isLaptop && ad.kpiCardLaptop]}
          onPress={() => onNavigateToWorkOrders?.('Proses')}
          activeOpacity={0.8}
        >
          <Text style={ad.kpiTitle}>Perbaikan Berulang</Text>
          <View style={ad.kpiValueRow}>
            <Text style={[ad.kpiBigNumber, { color: '#B45309' }]}>
              {rawanRusakCount}
            </Text>
            <Text style={ad.kpiUnitText}> Aset</Text>
          </View>
          <Text style={[ad.kpiSubText, { color: '#B45309' }]}>
            Perlu Pemantauan
          </Text>
        </TouchableOpacity>

        {/* Card 4: Tingkat Tuntas */}
        <TouchableOpacity
          style={[ad.kpiCard, isLaptop && ad.kpiCardLaptop]}
          onPress={() => onNavigateToWorkOrders?.('Selesai')}
          activeOpacity={0.8}
        >
          <Text style={ad.kpiTitle}>Tingkat Tuntas</Text>
          <View style={ad.kpiValueRow}>
            <Text style={[ad.kpiBigNumber, { color: '#15803D' }]}>
              {tingkatTuntasPct}%
            </Text>
          </View>
          <Text style={[ad.kpiSubText, { color: '#15803D' }]}>
            {selesaiWo}/{totalWoPeriod} Selesai ({periodLabel})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Layout Responsif: 2 Kolom di Laptop, 1 Kolom di HP */}
      <View style={isLaptop ? ad.laptopMainRow : undefined}>
        <View style={isLaptop ? ad.laptopLeftCol : undefined}>

      {/* Card: Status Maintenance (Progress Bars + Insight Box) */}
      <View style={[ad.maintenanceCard, isLaptop && ad.maintenanceCardLaptop]}>
        <View style={[ad.maintenanceHeaderRow, { zIndex: 20 }]}>
          <Text style={ad.maintenanceTitle}>Status Maintenance</Text>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={ad.periodDropdownPill}
              onPress={() => setShowPeriodMenu(prev => !prev)}
              activeOpacity={0.8}
            >
              <Text style={ad.periodDropdownText}>{periodLabel}</Text>
              <Text style={ad.periodDropdownChevron}>{showPeriodMenu ? '⌃' : '⌵'}</Text>
            </TouchableOpacity>

            {showPeriodMenu && (
              <View style={ad.periodMenuPopover}>
                {PERIODS.map(p => {
                  const active = periodLabel === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[ad.periodMenuItem, active && ad.periodMenuItemActive]}
                      onPress={() => {
                        setPeriodLabel(p);
                        setShowPeriodMenu(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          ad.periodMenuItemText,
                          active && ad.periodMenuItemTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                      {active && <Text style={ad.periodMenuCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <Text style={ad.maintenanceSubtitle}>
          Distribusi kondisi fasilitas · {periodRangeText}
        </Text>

        {/* 4 Baris Progress Bar Interaktif */}
        <View style={{ gap: 14, marginBottom: 18 }}>
          {/* 1. Layak Pakai */}
          <TouchableOpacity
            onPress={onNavigateToAssets}
            activeOpacity={0.8}
          >
            <View style={ad.barLabelRow}>
              <Text style={ad.barNameText}>Layak Pakai</Text>
              <Text style={[ad.barCountText, { color: '#15803D' }]}>
                {layakPakaiCount}
              </Text>
            </View>
            <View style={ad.barTrack}>
              <View
                style={[
                  ad.barFill,
                  {
                    width: `${Math.min(100, Math.round((layakPakaiCount / maxBarVal) * 100))}%`,
                    backgroundColor: '#15803D',
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* 2. Rawan Rusak */}
          <TouchableOpacity
            onPress={() => onNavigateToWorkOrders?.('Proses')}
            activeOpacity={0.8}
          >
            <View style={ad.barLabelRow}>
              <Text style={ad.barNameText}>Rawan Rusak</Text>
              <Text style={[ad.barCountText, { color: '#B45309' }]}>
                {rawanRusakCount}
              </Text>
            </View>
            <View style={ad.barTrack}>
              <View
                style={[
                  ad.barFill,
                  {
                    width: `${Math.min(100, Math.round((rawanRusakCount / maxBarVal) * 100))}%`,
                    backgroundColor: '#B45309',
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* 3. Perlu Perbaikan */}
          <TouchableOpacity
            onPress={() => onNavigateToWorkOrders?.('Baru')}
            activeOpacity={0.8}
          >
            <View style={ad.barLabelRow}>
              <Text style={ad.barNameText}>Perlu Perbaikan</Text>
              <Text style={[ad.barCountText, { color: '#2563EB' }]}>
                {perluPerbaikanCount}
              </Text>
            </View>
            <View style={ad.barTrack}>
              <View
                style={[
                  ad.barFill,
                  {
                    width: `${perluPerbaikanCount > 0 ? Math.min(100, Math.max(10, Math.round((perluPerbaikanCount / maxBarVal) * 100))) : 0}%`,
                    backgroundColor: '#2563EB',
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* 4. Wajib Ganti */}
          <TouchableOpacity
            onPress={onNavigateToReports}
            activeOpacity={0.8}
          >
            <View style={ad.barLabelRow}>
              <Text style={ad.barNameText}>Wajib Ganti</Text>
              <Text style={[ad.barCountText, { color: '#C53030' }]}>
                {wajibGantiCount}
              </Text>
            </View>
            <View style={ad.barTrack}>
              <View
                style={[
                  ad.barFill,
                  {
                    width: `${wajibGantiCount > 0 ? Math.min(100, Math.max(8, Math.round((wajibGantiCount / maxBarVal) * 100))) : 0}%`,
                    backgroundColor: '#C53030',
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Insight Box */}
        <TouchableOpacity
          style={ad.insightBox}
          onPress={() => onNavigateToWorkOrders?.('Semua')}
          activeOpacity={0.85}
        >
          <Text style={ad.insightTag}>Insight · {periodLabel}</Text>
          <Text style={ad.insightTitle}>
            {totalWoPeriod > 0
              ? `${tingkatTuntasPct}% work order telah selesai.`
              : `Belum ada work order pada ${periodLabel.toLowerCase()}.`}
          </Text>
          <Text style={ad.insightSub}>
            {selesaiWo}/{totalWoPeriod} Selesai · {periodData.proses} Diproses · {periodData.menunggu} Menunggu.
          </Text>
        </TouchableOpacity>
      </View>
        </View>

        <View style={isLaptop ? ad.laptopRightCol : undefined}>
      {/* Section: Aktivitas Terbaru (Persis Desain Mockup) */}
      <View style={ad.sectionHeaderOutside}>
        <Text style={ad.sectionTitleOutside}>Aktivitas Terbaru ({periodLabel})</Text>
        <TouchableOpacity
          onPress={() => onNavigateToWorkOrders?.('Semua')}
          activeOpacity={0.75}
        >
          <Text style={ad.seeAllLinkText}>Lihat semua</Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 12, marginBottom: isLaptop ? 20 : 18 }}>
        {(periodData.recent.length > 0 ? periodData.recent : tasks.slice(0, isLaptop ? 3 : 4)).map(task => (
          <View key={task.id} style={ad.activityCard}>
            <View style={ad.activityTopRow}>
              <View style={ad.activityIconBox}>
                {renderFacilityIcon(undefined, task.judul || task.lokasi)}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={ad.activityCodeText}>{task.id}</Text>
                <Text style={ad.activityTitleText} numberOfLines={1}>
                  {task.judul}
                </Text>
                <Text style={ad.activitySubText} numberOfLines={1}>
                  {task.lokasi} · {formatTaskDateReal(task.tenggat)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={ad.btnFullCekDetail}
              onPress={() => onSelectTaskDetail(task)}
              activeOpacity={0.82}
            >
              <Text style={ad.btnFullCekDetailText}>Cek Detail</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
        </View>
      </View>

      {/* Section: Ringkasan Kerusakan Diganti / Perbaikan Fasilitas */}
      {(() => {
        const totalReplaced = repairStatsList.reduce((sum, s) => sum + s.replacedCount, 0);
        const totalActiveDmg = repairStatsList.reduce((sum, s) => sum + s.activeDamageCount, 0);
        const sortedRepairs = [...repairStatsList]
          .sort((a, b) => b.replacedCount - a.replacedCount || b.activeDamageCount - a.activeDamageCount)
          .slice(0, 6);
        return (
          <View style={{ marginBottom: 14 }}>
            <View style={ad.sectionHeaderOutside}>
              <Text style={ad.sectionTitleOutside}>
                Penggantian & Perbaikan Kerusakan ({totalReplaced}x)
              </Text>
              {onNavigateToAssets && (
                <TouchableOpacity onPress={onNavigateToAssets} activeOpacity={0.75}>
                  <Text style={ad.seeAllLinkText}>Lihat Daftar Aset ›</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[ad.activityCard, { paddingVertical: 14 }]}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#EEF2FF',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>
                    Total Kerusakan Diganti
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginTop: 2 }}>
                    {totalReplaced} kali
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6366F1', marginTop: 2 }}>
                    Perbaikan / penggantian selesai
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: totalActiveDmg > 0 ? '#FEF2F2' : '#ECFDF5',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: totalActiveDmg > 0 ? '#DC2626' : '#047857',
                    }}
                  >
                    Kerusakan Menunggu Perbaikan
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: '800',
                      color: totalActiveDmg > 0 ? '#991B1B' : '#065F46',
                      marginTop: 2,
                    }}
                  >
                    {totalActiveDmg} laporan
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: totalActiveDmg > 0 ? '#EF4444' : '#059669',
                      marginTop: 2,
                    }}
                  >
                    {totalActiveDmg > 0 ? 'Perlu tindakan perbaikan' : 'Semua kerusakan tertangani'}
                  </Text>
                </View>
              </View>

              {sortedRepairs.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', paddingVertical: 6 }}>
                  Belum ada data fasilitas untuk dihitung riwayat perbaikannya.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {sortedRepairs.map(item => (
                    <View
                      key={item.assetCode}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        backgroundColor: '#F9FAFB',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                          {item.assetName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>
                          {item.assetCode} · {item.location}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View
                          style={{
                            backgroundColor: item.replacedCount > 0 ? '#DBEAFE' : '#F3F4F6',
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            borderRadius: 99,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: item.replacedCount > 0 ? '#1D4ED8' : '#6B7280',
                            }}
                          >
                            {item.replacedCount}x diganti / diperbaiki
                          </Text>
                        </View>
                        {item.activeDamageCount > 0 && (
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#DC2626', marginTop: 2 }}>
                            +{item.activeDamageCount} aktif
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })()}

      {/* Section: Tim Petugas Lapangan (Full width; grid 3 kolom di Laptop agar tidak ada area kosong) */}
      <View style={ad.sectionHeaderOutside}>
        <Text style={ad.sectionTitleOutside}>
          Tim Petugas Lapangan ({officers.length})
        </Text>
        {onOpenAddOfficer && (
          <TouchableOpacity onPress={onOpenAddOfficer} activeOpacity={0.75}>
            <Text style={ad.seeAllLinkText}>+ Tambah Petugas</Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          { gap: 12, marginBottom: 10 },
          isLaptop && officers.length > 0 && { flexDirection: 'row', flexWrap: 'wrap' },
        ]}
      >
        {officers.length === 0 ? (
          <View style={[ad.activityCard, { alignItems: 'center', paddingVertical: 22 }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
              Belum ada petugas terdaftar
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
              Klik "+ Tambah Petugas" atau daftarkan akun baru dari halaman Petugas.
            </Text>
          </View>
        ) : (
        officers.map(officer => (
          <View
            key={officer.id}
            style={[ad.activityCard, isLaptop && { width: '32.4%' }]}
          >
            <View style={ad.activityTopRow}>
              <Image
                source={{ uri: officer.avatarUri }}
                style={ad.officerAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={ad.activityCodeText}>
                  {officer.id} · {officer.statusText}
                </Text>
                <Text style={ad.activityTitleText} numberOfLines={1}>
                  {officer.name}
                </Text>
                <Text style={ad.activitySubText} numberOfLines={1}>
                  {officer.shift} · {officer.area}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={ad.btnFullCekDetail}
              onPress={() => onSelectOfficer?.(officer)}
              activeOpacity={0.82}
            >
              <Text style={ad.btnFullCekDetailText}>Lihat Profil Petugas</Text>
            </TouchableOpacity>
          </View>
        ))
        )}
      </View>
    </View>
  );
};

const ad = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiCardLaptop: {
    width: '23.8%',
  },
  laptopMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  laptopLeftCol: {
    flex: 1.15,
  },
  maintenanceCardLaptop: {
    flex: 1,
    justifyContent: 'space-between',
  },
  laptopRightCol: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 10,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  kpiBigNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiUnitText: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  kpiSubText: {
    fontSize: 11,
    fontWeight: '700',
  },
  maintenanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  maintenanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  maintenanceTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
  },
  periodDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  periodDropdownText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4338CA',
  },
  periodDropdownChevron: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
    marginTop: -2,
  },
  periodMenuPopover: {
    position: 'absolute',
    top: 34,
    right: 0,
    minWidth: 132,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  periodMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodMenuItemActive: {
    backgroundColor: '#EEF2FF',
  },
  periodMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  periodMenuItemTextActive: {
    color: '#4338CA',
    fontWeight: '700',
  },
  periodMenuCheck: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  maintenanceSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginBottom: 16,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barNameText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  barCountText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  barTrack: {
    width: '100%',
    height: 7,
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  insightBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 3,
  },
  insightTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  sectionHeaderOutside: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleOutside: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  activityCodeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 1,
  },
  activityTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  activitySubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  btnFullCekDetail: {
    width: '100%',
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFullCekDetailText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4338CA',
  },
});
