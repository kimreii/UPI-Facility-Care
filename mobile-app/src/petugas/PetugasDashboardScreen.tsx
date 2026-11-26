import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Task } from '../types';
import { PetugasReport } from './PetugasIcons';
import { RecentInspectionDto } from '../api';
import { useRealtimeClock, formatShortDateId, formatTimeId } from '../dateUtils';
import { UnifiedBellButton } from '../NotificationModal';

export interface PetugasProfileData {
  id: string;
  name: string;
  role: string;
  shift: string;
  area: string;
  phone: string;
  avatarUri: string;
  statusText: 'Aktif Bertugas' | 'Istirahat';
  completionRate: number;
}

interface PetugasDashboardScreenProps {
  tasks: Task[];
  reports: PetugasReport[];
  inspections: RecentInspectionDto[];
  profile: PetugasProfileData;
  notifCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenWorkOrders: (filter?: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => void;
  onOpenTaskDetail: (task: Task) => void;
  onPreviewAiImage: (uri: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  embeddedInAdmin?: boolean;
}

export const PetugasDashboardScreen: React.FC<PetugasDashboardScreenProps> = ({
  tasks,
  reports,
  inspections,
  profile,
  notifCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenWorkOrders,
  onOpenTaskDetail,
  onPreviewAiImage,
  refreshing,
  onRefresh,
  embeddedInAdmin = false,
}) => {
  const { fullDateStr, now } = useRealtimeClock();
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = !embeddedInAdmin && screenWidth >= 900;
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(3); // Default highlight Kamis (Ka)

  // Hitung metrik Progress Work Order secara real-time dari Microsoft SQL Server
  const selesaiCount = tasks.filter(t => t.status === 'Selesai').length;
  const prosesCount = tasks.filter(t => t.status === 'Diproses').length;
  const menungguCount = tasks.filter(t => t.status === 'Menunggu').length;
  const belumCount = prosesCount + menungguCount;

  // Hanya cocokkan inspeksi AI yang benar-benar berasal dari tugas aktif yang sudah difoto oleh petugas
  const inspectedTasks = tasks.filter(
    t =>
      Boolean(t.foto) ||
      t.inspectionId !== undefined ||
      typeof t.cleanlinessPercentage === 'number'
  );
  const taskInspectionIds = new Set(
    inspectedTasks.map(t => t.inspectionId).filter((id): id is number => typeof id === 'number')
  );
  const activeTaskInspections = inspections.filter(i => taskInspectionIds.has(i.inspection_id));

  // Hitung AI Flag dari inspeksi AI yang kotor/rusak pada tugas aktif saat ini
  const flaggedInspections = activeTaskInspections.filter(
    i =>
      i.cleanliness_percentage < 80 ||
      i.total_defects > 0 ||
      i.total_trash > 0 ||
      (i.severity_level && i.severity_level !== 'None' && i.severity_level !== 'Low')
  );
  const flaggedTasks = inspectedTasks.filter(
    t =>
      (t.cleanlinessPercentage !== undefined && t.cleanlinessPercentage < 80) ||
      (t.aiStatus && t.aiStatus.toLowerCase().includes('kerusakan'))
  );
  const aiFlagCount =
    inspectedTasks.length === 0
      ? 0
      : flaggedTasks.length || flaggedInspections.length;

  const totalWoDisplay = tasks.length;

  // Tingkat Penyelesaian Real-Time berdasarkan tugas di database SQL Server
  const realTaskCompletionPct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const weightedDone = selesaiCount + prosesCount * 0.5;
    return Math.min(100, Math.max(10, Math.round((weightedDone / tasks.length) * 100)));
  }, [tasks.length, selesaiCount, prosesCount]);

  // Donut Chart Geometry
  const donutSize = 136;
  const strokeWidth = 26;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const sumSegments = Math.max(1, selesaiCount + belumCount + aiFlagCount);

  const greenRatio = selesaiCount / sumSegments;
  const cyanRatio = belumCount / sumSegments;
  const redRatio = aiFlagCount / sumSegments;

  const greenLen = greenRatio * circumference;
  const cyanLen = cyanRatio * circumference;
  const redLen = redRatio * circumference;

  const greenOffset = 0;
  const redOffset = greenLen;
  const cyanOffset = greenLen + redLen;

  // Data Bar Chart Mingguan (Se, Se, Ra, Ka, Ju, Sa) yang bergerak real-time saat tugas diselesaikan di SQL Server
  const avgCleanlinessDb = useMemo(() => {
    if (inspections.length > 0) {
      const sum = inspections.reduce((acc, item) => acc + (item.cleanliness_percentage || 90), 0);
      return Math.round(sum / inspections.length);
    }
    return realTaskCompletionPct;
  }, [inspections, realTaskCompletionPct]);

  const todayBarIdx = useMemo(() => {
    const day = now.getDay(); // 0=Minggu, 1=Senin..6=Sabtu
    if (day >= 1 && day <= 6) return day - 1;
    return 3;
  }, [now]);

  const weeklyBars = useMemo(() => {
    const days = [
      { short: 'Se', full: 'Senin' },
      { short: 'Se', full: 'Selasa' },
      { short: 'Ra', full: 'Rabu' },
      { short: 'Ka', full: 'Kamis' },
      { short: 'Ju', full: 'Jumat' },
      { short: 'Sa', full: 'Sabtu' },
    ];
    if (tasks.length === 0) {
      return days.map(d => ({ ...d, pct: 0, tasksDone: 0 }));
    }
    const liveTodayScore = Math.max(realTaskCompletionPct, avgCleanlinessDb);
    return days.map((d, idx) =>
      idx === todayBarIdx
        ? { ...d, pct: liveTodayScore, tasksDone: selesaiCount }
        : { ...d, pct: 0, tasksDone: 0 }
    );
  }, [tasks.length, realTaskCompletionPct, avgCleanlinessDb, selesaiCount, todayBarIdx]);

  const activeDayBar = weeklyBars[selectedDayIdx] || weeklyBars[todayBarIdx];

  // Hanya tampilkan temuan AI Camera Vision jika petugas sudah benar-benar memotret / melakukan inspeksi AI
  const hasActiveAiData = inspectedTasks.length > 0;
  const latestFlaggedInspection = hasActiveAiData
    ? flaggedInspections[0] || activeTaskInspections[0] || null
    : null;
  const latestFlaggedTask = flaggedTasks[0] || inspectedTasks[0];

  // Tugas tujuan "Lihat Lokasi" HARUS sama dengan lokasi yang ditulis di kartu AI Camera Vision.
  // Dicocokkan dari inspeksi (id inspeksi -> kode aset -> nama ruangan), bukan sembarang tugas toilet.
  const aiTargetTask: Task | undefined = useMemo(() => {
    if (!latestFlaggedInspection) return latestFlaggedTask;
    const insp = latestFlaggedInspection;
    const roomName = (insp.room_name || '').toLowerCase().trim();
    const matched =
      tasks.find(t => t.inspectionId !== undefined && t.inspectionId === insp.inspection_id) ||
      tasks.find(t => !!insp.room_code && t.assetCode === insp.room_code) ||
      tasks.find(
        t =>
          !!roomName &&
          (t.judul.toLowerCase().includes(roomName) ||
            roomName.includes(t.judul.toLowerCase()) ||
            (t.lokasi || '').toLowerCase().includes(roomName))
      );
    if (matched) return matched;
    return {
      id: `INS-${insp.inspection_id}`,
      assetCode: insp.room_code,
      judul: insp.room_name,
      lokasi: `Lt.${insp.floor_number || 1} - ${insp.building || ''}`.replace(/ - $/, ''),
      petugas: profile.name,
      prioritas: 'Tinggi',
      tenggat: formatShortDateId(now),
      deskripsi: insp.notes || 'Temuan AI Camera Vision pada area ini.',
      status: 'Diproses',
      catatan: insp.notes || '',
      foto: insp.image_url || '',
      cleanlinessPercentage: insp.cleanliness_percentage,
      inspectionId: insp.inspection_id,
    } as Task;
  }, [latestFlaggedInspection, tasks, latestFlaggedTask, profile.name, now]);

  const aiCleanlinessScore = latestFlaggedInspection
    ? Math.round(latestFlaggedInspection.cleanliness_percentage)
    : latestFlaggedTask?.cleanlinessPercentage
    ? Math.round(latestFlaggedTask.cleanlinessPercentage)
    : 62;

  const aiLocationName = latestFlaggedInspection
    ? `${latestFlaggedInspection.room_name} - Lantai ${latestFlaggedInspection.floor_number || 1}`
    : latestFlaggedTask
    ? `${latestFlaggedTask.judul} - ${latestFlaggedTask.lokasi}`
    : 'Belum ada lokasi terdeteksi';

  const aiProblemCount = latestFlaggedInspection
    ? Math.max(1, (latestFlaggedInspection.total_defects || 0) + (latestFlaggedInspection.total_trash || 0))
    : 1;

  const aiImageUri = latestFlaggedInspection?.image_url || latestFlaggedTask?.foto || '';
  const hasRealAiPhoto = hasActiveAiData && Boolean(aiImageUri);
  const aiImageSource = { uri: aiImageUri };

  const aiTimestampStr = `${formatShortDateId(now)} ${formatTimeId(now, ':')}`;

  return (
    <View style={{ marginBottom: embeddedInAdmin ? 4 : 10 }}>
      {/* Header Row: Real-Time Date, Dashboard Title, Subtitle, Bell & Profile Avatar */}
      {!embeddedInAdmin && (
      <View style={ds.headerRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={ds.headerDate}>{fullDateStr}</Text>
          <Text style={ds.headerTitle}>Dashboard</Text>
          <Text style={ds.headerSubtitle}>
            Berikut ringkasan kondisi maintenance kampus hari ini.
          </Text>
        </View>

        <View style={ds.headerActionsRow}>
          <UnifiedBellButton count={notifCount} onPress={onOpenNotifications} />

          <TouchableOpacity
            style={ds.profileAvatarBtn}
            onPress={onOpenProfile}
            activeOpacity={0.82}
          >
            <Image source={{ uri: profile.avatarUri }} style={ds.profileAvatarImg} />
            <View
              style={[
                ds.profileOnlineDot,
                {
                  backgroundColor:
                    profile.statusText === 'Aktif Bertugas' ? '#10B981' : '#F59E0B',
                },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Grid Responsif: 3 Kartu Sejajar di Laptop, Bertumpuk di HP */}
      <View
        style={
          isLaptop
            ? {
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: 16,
              }
            : undefined
        }
      >
      {/* CARD 1: Progress Work Order */}
      <View style={[ds.card, isLaptop && { flex: 1, marginBottom: 14 }]}>
        <View style={ds.cardTopRow}>
          <Text style={ds.cardTitle}>Progress Work Order</Text>
          <TouchableOpacity
            onPress={() => onOpenWorkOrders('Semua')}
            activeOpacity={0.75}
          >
            <Text style={ds.cardActionLink}>Lihat Work Order ›</Text>
          </TouchableOpacity>
        </View>

        <View style={ds.donutSectionRow}>
          {/* Donut Chart */}
          <TouchableOpacity
            style={{ width: donutSize, height: donutSize, position: 'relative' }}
            onPress={() => onOpenWorkOrders('Semua')}
            activeOpacity={0.85}
          >
            <Svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
              <G rotation="-90" origin={`${donutSize / 2}, ${donutSize / 2}`}>
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Hijau: Sudah Selesai */}
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  stroke="#15B76C"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${greenLen} ${circumference - greenLen}`}
                  strokeDashoffset={-greenOffset}
                  fill="transparent"
                />
                {/* Merah: AI Flag */}
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  stroke="#FF2E2E"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${redLen} ${circumference - redLen}`}
                  strokeDashoffset={-redOffset}
                  fill="transparent"
                />
                {/* Biru Toska: Belum Dimulai */}
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  stroke="#38B2AC"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${cyanLen} ${circumference - cyanLen}`}
                  strokeDashoffset={-cyanOffset}
                  fill="transparent"
                />
              </G>
            </Svg>
            <View style={ds.donutCenterWrap}>
              <Text style={ds.donutCenterNum}>{totalWoDisplay}</Text>
            </View>
          </TouchableOpacity>

          {/* Interactive Legend */}
          <View style={ds.donutLegendCol}>
            <TouchableOpacity
              style={ds.legendRow}
              onPress={() => onOpenWorkOrders('Selesai')}
              activeOpacity={0.75}
            >
              <View style={[ds.legendDot, { backgroundColor: '#15B76C' }]} />
              <Text style={ds.legendLabel}>Sudah Selesai ({selesaiCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={ds.legendRow}
              onPress={() => onOpenWorkOrders('Baru')}
              activeOpacity={0.75}
            >
              <View style={[ds.legendDot, { backgroundColor: '#38B2AC' }]} />
              <Text style={ds.legendLabel}>Belum Dimulai ({belumCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={ds.legendRow}
              onPress={() => {
                if (aiTargetTask) {
                  onOpenTaskDetail(aiTargetTask);
                } else {
                  onOpenWorkOrders('Semua');
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[ds.legendDot, { backgroundColor: '#FF2E2E' }]} />
              <Text style={ds.legendLabel}>AI Flag ({aiFlagCount})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Summary Pill inside Card 1 */}
        <TouchableOpacity
          style={ds.avgCompletionPill}
          onPress={() => onOpenWorkOrders('Selesai')}
          activeOpacity={0.82}
        >
          <View style={{ flex: 1 }}>
            <Text style={ds.avgLabel}>Rata-rata penyelesaian</Text>
            <Text style={ds.avgValueBold}>{selesaiCount > 0 ? '1 hari' : '-'}</Text>
          </View>

          <View style={ds.avgGreenDivider} />

          <View style={{ flex: 0.9, alignItems: 'center' }}>
            <Text style={ds.avgPercentGreen}>{selesaiCount > 0 ? '+12%' : '0%'}</Text>
            <Text style={ds.avgSubText}>
              {selesaiCount > 0 ? 'dari minggu lalu' : 'belum ada tugas'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* CARD 2: Performa Petugas */}
      <View style={[ds.card, isLaptop && { flex: 1.1, marginBottom: 14 }]}>
        <TouchableOpacity
          style={ds.performaHeaderRow}
          onPress={onOpenProfile}
          activeOpacity={0.8}
        >
          <Image source={{ uri: profile.avatarUri }} style={ds.performaAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={ds.cardTitle}>Performa Petugas</Text>
            <Text style={ds.performaSubtitle}>
              Kinerja tim fasilitas hari ini
            </Text>
          </View>
        </TouchableOpacity>

        <View style={ds.performaBodyRow}>
          {/* Interactive Weekly Bar Chart */}
          <View style={ds.barChartContainer}>
            <View style={ds.barGridArea}>
              <View style={[ds.dashedGridLine, { top: 0 }]} />
              <View style={[ds.dashedGridLine, { top: '33%' }]} />
              <View style={[ds.dashedGridLine, { top: '66%' }]} />
              <View style={ds.solidBottomAxisLine} />
              <Text style={ds.zeroAxisLabel}>0</Text>

              <View style={ds.barsRow}>
                {weeklyBars.map((bar, idx) => {
                  const isSelected = idx === selectedDayIdx;
                  const barHeightPct = bar.pct > 0 ? Math.max(12, Math.min(100, bar.pct)) : 4;
                  return (
                    <TouchableOpacity
                      key={`${bar.full}-${idx}`}
                      style={ds.barColTouch}
                      onPress={() => setSelectedDayIdx(idx)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          ds.barFill,
                          {
                            height: `${barHeightPct}%`,
                            backgroundColor:
                              bar.pct === 0
                                ? '#E5E7EB'
                                : isSelected
                                ? '#0D9F5F'
                                : '#19B875',
                            opacity: bar.pct === 0 ? 1 : isSelected ? 1 : 0.85,
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Day Labels Row */}
            <View style={ds.barDaysRow}>
              {weeklyBars.map((bar, idx) => {
                const isSelected = idx === selectedDayIdx;
                return (
                  <TouchableOpacity
                    key={`label-${bar.full}-${idx}`}
                    style={ds.barDayLabelCol}
                    onPress={() => setSelectedDayIdx(idx)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        ds.barDayText,
                        isSelected && { color: '#0D9F5F', fontWeight: '800' },
                      ]}
                    >
                      {bar.short[0]}
                      {'\n'}
                      {bar.short[1]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={ds.performaVerticalDivider} />

          {/* Right KPI Highlight Column */}
          <View style={ds.performaRightCol}>
            <Text style={ds.bigRateNumber}>{activeDayBar.pct}%</Text>
            <Text style={ds.bigRateLabel}>Tingkat Penyelesaian</Text>

            <TouchableOpacity
              style={ds.bestOfficerCard}
              onPress={onOpenProfile}
              activeOpacity={0.82}
            >
              <Text style={ds.bestOfficerSmall}>Petugas terbaik</Text>
              <Text style={ds.bestOfficerName} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={ds.bestOfficerScore}>
                {realTaskCompletionPct}% Penyelesaian
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CARD 3: AI Camera Vision */}
      <View style={[ds.card, isLaptop && { flex: 1.15, marginBottom: 14 }]}>
        <Text style={ds.cardTitle}>AI Camera Vision</Text>
        <Text style={ds.performaSubtitle}>Hasil Deteksi Kamera Vision</Text>

        {!hasRealAiPhoto ? (
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              paddingVertical: 28,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 6,
            }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
              Belum ada hasil deteksi kamera
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 17 }}>
              Hasil analisis AI Camera Vision akan muncul setelah Anda mengerjakan tugas atau memindai QR fasilitas.
            </Text>
          </View>
        ) : (
        <View style={ds.aiVisionContentRow}>
          {/* Left Annotated Camera Preview */}
          <TouchableOpacity
            style={ds.aiImageCard}
            onPress={() => onPreviewAiImage(aiImageSource.uri)}
            activeOpacity={0.88}
          >
            <Image source={aiImageSource} style={ds.aiPreviewImage} resizeMode="cover" />

            {/* Top Left Red AI Flag Pill */}
            <View style={ds.aiFlagTopPill}>
              <Text style={ds.aiFlagTopPillText}>AI Flag</Text>
            </View>

            {/* Top Right Live Timestamp */}
            <View style={ds.aiTimeTopPill}>
              <View style={ds.aiRecRedDot} />
              <Text style={ds.aiTimeTopPillText}>{aiTimestampStr}</Text>
            </View>

            {/* Left White Translucent Info Overlay */}
            <View style={ds.aiHudOverlayBox}>
              <Text style={ds.aiHudHeading}>Hasil Deteksi AI</Text>
              <Text style={ds.aiHudMetricText}>
                Kebersihan Area:{' '}
                <Text style={ds.aiHudMetricRed}>{aiCleanlinessScore}%</Text>
              </Text>
              <Text style={ds.aiHudThresholdText}>Threshold: 80%</Text>
              <Text style={ds.aiHudLocLabel}>Lokasi Kamera:</Text>
              <Text style={ds.aiHudLocValue} numberOfLines={2}>
                {aiLocationName}
              </Text>
            </View>

            {/* Red Detection Bounding Box Overlay */}
            <View style={ds.aiRedBboxOverlay} pointerEvents="none">
              <View style={ds.aiRedBboxTag}>
                <Text style={ds.aiRedBboxTagText}>Area Kotor</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Column: Pink Alert Card & Lihat Lokasi Button */}
          <View style={ds.aiRightCol}>
            <TouchableOpacity
              style={ds.aiPinkProblemCard}
              onPress={() => onPreviewAiImage(aiImageSource.uri)}
              activeOpacity={0.85}
            >
              <Text style={ds.aiPinkProblemTitle}>
                {aiProblemCount} Area Bermasalah
              </Text>
              <Text style={ds.aiPinkProblemSub}>Permukaan masih kotor</Text>
              <Text style={ds.aiPinkProblemPct}>
                Presentase : ({aiCleanlinessScore}%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={ds.btnLihatLokasi}
              onPress={() => {
                if (aiTargetTask) {
                  onOpenTaskDetail(aiTargetTask);
                } else {
                  onOpenWorkOrders('Semua');
                }
              }}
              activeOpacity={0.82}
            >
              <Text style={ds.btnLihatLokasiText}>Lihat Lokasi</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}
      </View>
      </View>
    </View>
  );
};

const ds = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    backgroundColor: '#EBECEF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 105,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerDate: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    padding: 1,
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  cardActionLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  donutSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  donutCenterWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterNum: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },
  donutLegendCol: {
    gap: 12,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  legendLabel: {
    fontSize: 12.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  avgCompletionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 11,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avgLabel: {
    fontSize: 11.5,
    color: '#374151',
    marginBottom: 2,
  },
  avgValueBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  avgGreenDivider: {
    width: 1.5,
    height: 32,
    backgroundColor: '#10B981',
    marginHorizontal: 12,
  },
  avgPercentGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15B76C',
    marginBottom: 1,
  },
  avgSubText: {
    fontSize: 11,
    color: '#4B5563',
  },
  performaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  performaAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  performaSubtitle: {
    fontSize: 11.5,
    color: '#4B5563',
    marginTop: 2,
  },
  performaBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  barChartContainer: {
    flex: 1.25,
    paddingLeft: 12,
    paddingRight: 8,
  },
  barGridArea: {
    height: 98,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  dashedGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  solidBottomAxisLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#9CA3AF',
  },
  zeroAxisLabel: {
    position: 'absolute',
    left: -12,
    bottom: -4,
    fontSize: 10,
    color: '#6B7280',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
  },
  barColTouch: {
    width: 18,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 16,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  barDayLabelCol: {
    width: 18,
    alignItems: 'center',
  },
  barDayText: {
    fontSize: 10.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 13,
  },
  performaVerticalDivider: {
    width: 1.5,
    height: 120,
    backgroundColor: '#6B7280',
    marginHorizontal: 10,
  },
  performaRightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigRateNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#15B76C',
  },
  bigRateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15B76C',
    marginBottom: 10,
    textAlign: 'center',
  },
  bestOfficerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bestOfficerSmall: {
    fontSize: 9.5,
    color: '#4B5563',
    marginBottom: 1,
  },
  bestOfficerName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  bestOfficerScore: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15B76C',
  },
  aiVisionContentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'stretch',
  },
  aiImageCard: {
    flex: 1.45,
    height: 142,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1F2937',
  },
  aiPreviewImage: {
    width: '100%',
    height: '100%',
  },
  aiFlagTopPill: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  aiFlagTopPillText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  aiTimeTopPill: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiRecRedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },
  aiTimeTopPillText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '600',
  },
  aiHudOverlayBox: {
    position: 'absolute',
    top: 28,
    left: 7,
    width: 112,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 8,
    padding: 6,
  },
  aiHudHeading: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  aiHudMetricText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#111827',
  },
  aiHudMetricRed: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 9,
  },
  aiHudThresholdText: {
    fontSize: 7,
    color: '#6B7280',
    marginBottom: 3,
  },
  aiHudLocLabel: {
    fontSize: 7,
    color: '#6B7280',
  },
  aiHudLocValue: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#111827',
  },
  aiRedBboxOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: '44%',
    height: '48%',
    borderWidth: 1.8,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderRadius: 4,
  },
  aiRedBboxTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 4,
  },
  aiRedBboxTagText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
  },
  aiRightCol: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  aiPinkProblemCard: {
    flex: 1,
    backgroundColor: '#F28B8B',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
  aiPinkProblemTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  aiPinkProblemSub: {
    fontSize: 9,
    color: '#1F2937',
    marginBottom: 4,
  },
  aiPinkProblemPct: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#111827',
  },
  btnLihatLokasi: {
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  btnLihatLokasiText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
});
