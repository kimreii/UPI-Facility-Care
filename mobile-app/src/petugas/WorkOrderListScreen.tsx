import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Task } from '../types';
import { PetugasReport, TaskFacilityIcon } from './PetugasIcons';
import { RecentInspectionDto } from '../api';
import { PetugasDashboardScreen, PetugasProfileData } from './PetugasDashboardScreen';
import { st } from './petugasStyles';
import { useRealtimeClock, formatTaskDateReal } from '../dateUtils';

interface WorkOrderListScreenProps {
  tasks: Task[];
  filteredTasks: Task[];
  reports: PetugasReport[];
  inspections: RecentInspectionDto[];
  profile: PetugasProfileData;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  filterStatus: 'Semua' | 'Baru' | 'Proses' | 'Selesai';
  onChangeFilterStatus: (status: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => void;
  countSemua: number;
  countBaru: number;
  countProses: number;
  countSelesai: number;
  notifCount?: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onPreviewAiImage: (uri: string) => void;
  onOpenTask: (task: Task) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export const WorkOrderListScreen: React.FC<WorkOrderListScreenProps> = ({
  tasks,
  filteredTasks,
  reports,
  inspections,
  profile,
  searchQuery,
  onChangeSearch,
  filterStatus,
  onChangeFilterStatus,
  countSemua,
  countBaru,
  countProses,
  countSelesai,
  notifCount,
  onOpenNotifications,
  onOpenProfile,
  onPreviewAiImage,
  onOpenTask,
  refreshing,
  onRefresh,
}) => {
  const { shortDateStr } = useRealtimeClock();
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;
  const scrollRef = useRef<ScrollView>(null);
  const [woSectionY, setWoSectionY] = useState<number>(520);
  const badgeCount =
    typeof notifCount === 'number' ? notifCount : countBaru + countProses;

  const handleJumpToWorkOrders = (filter?: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => {
    if (filter) {
      onChangeFilterStatus(filter);
    }
    scrollRef.current?.scrollTo({ y: woSectionY, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={st.dashboardScroll}
      contentContainerStyle={st.dashboardScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* BAGIAN ATAS: Dashboard KPI Petugas */}
      <PetugasDashboardScreen
        tasks={tasks}
        reports={reports}
        inspections={inspections}
        profile={profile}
        notifCount={badgeCount}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenWorkOrders={handleJumpToWorkOrders}
        onOpenTaskDetail={onOpenTask}
        onPreviewAiImage={onPreviewAiImage}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* BAGIAN BAWAH: Work Order & Daftar Tugas (Dalam 1 Halaman di Bawah Dashboard) */}
      <View
        onLayout={e => setWoSectionY(e.nativeEvent.layout.y)}
        style={{ marginTop: 4, marginBottom: 12 }}
      >
        <Text style={st.dashHeaderTitle}>Work Order</Text>
        <Text style={st.dashHeaderSubtitle}>
          Berikut daftar tugas pemeliharaan fasilitas kampus hari ini.
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={st.searchContainer}>
        <View style={{ marginRight: 8 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="2.2" />
            <Path d="M20 20L16.5 16.5" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" />
          </Svg>
        </View>
        <TextInput
          style={st.searchInput}
          placeholder="Cari tipe tugas (nama, lokasi, jenis...)"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={onChangeSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onChangeSearch('')}>
            <Text style={{ color: '#9CA3AF', fontSize: 13, paddingHorizontal: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills Row */}
      <View style={st.filterPillsRow}>
        <TouchableOpacity
          style={[
            st.filterPill,
            filterStatus === 'Semua' ? st.filterPillActive : st.filterPillInactive,
          ]}
          onPress={() => onChangeFilterStatus('Semua')}
          activeOpacity={0.8}
        >
          <Text style={st.filterPillText}>Semua</Text>
          <View
            style={[
              st.filterPillBadge,
              filterStatus === 'Semua' ? st.filterPillBadgeActive : st.filterPillBadgeInactive,
            ]}
          >
            <Text style={st.filterPillCount}>{countSemua}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            st.filterPill,
            filterStatus === 'Baru' ? st.filterPillActive : st.filterPillInactive,
          ]}
          onPress={() => onChangeFilterStatus('Baru')}
          activeOpacity={0.8}
        >
          <Text style={st.filterPillText}>Baru</Text>
          <View
            style={[
              st.filterPillBadge,
              filterStatus === 'Baru' ? st.filterPillBadgeActive : st.filterPillBadgeInactive,
            ]}
          >
            <Text style={st.filterPillCount}>{countBaru}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            st.filterPill,
            filterStatus === 'Proses' ? st.filterPillActive : st.filterPillInactive,
          ]}
          onPress={() => onChangeFilterStatus('Proses')}
          activeOpacity={0.8}
        >
          <Text style={st.filterPillText}>Proses</Text>
          <View
            style={[
              st.filterPillBadge,
              filterStatus === 'Proses' ? st.filterPillBadgeActive : st.filterPillBadgeInactive,
            ]}
          >
            <Text style={st.filterPillCount}>{countProses}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            st.filterPill,
            filterStatus === 'Selesai' ? st.filterPillActive : st.filterPillInactive,
          ]}
          onPress={() => onChangeFilterStatus('Selesai')}
          activeOpacity={0.8}
        >
          <Text style={st.filterPillText}>Selesai</Text>
          <View
            style={[
              st.filterPillBadge,
              filterStatus === 'Selesai' ? st.filterPillBadgeActive : st.filterPillBadgeInactive,
            ]}
          >
            <Text style={st.filterPillCount}>{countSelesai}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section Title: Daftar Tugas */}
      <Text style={st.daftarTugasTitle}>Daftar Tugas</Text>

      {/* Task Cards List (2 Kolom di Laptop, 1 Kolom di HP) */}
      <View
        style={
          isLaptop
            ? {
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                rowGap: 14,
              }
            : { gap: 12 }
        }
      >
        {filteredTasks.map(t => {
          const isHigh = t.prioritas === 'Tinggi';
          const floorText = t.judul.includes('Lantai')
            ? `Lantai ${t.judul.split('Lantai')[1].trim()}`
            : t.lokasi && t.lokasi.includes('Lt.')
            ? t.lokasi.split('-')[0].replace('Lt.', 'Lantai ').trim()
            : 'Lantai 1';
          const titleText = t.judul.includes('Lantai')
            ? t.judul.split('Lantai')[0].trim()
            : t.judul;

          return (
            <TouchableOpacity
              key={t.id}
              style={[
                st.dashTaskCard,
                isLaptop && { width: '49%' },
              ]}
              onPress={() => onOpenTask(t)}
              activeOpacity={0.88}
            >
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={st.dashTaskIconBox}>
                  <TaskFacilityIcon judul={t.judul} />
                </View>

                <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 82 }}>
                  <View>
                    <Text style={st.dashTaskId}>{t.id}</Text>
                    <Text style={st.dashTaskTitle}>{titleText}</Text>
                    <Text style={st.dashTaskFloor}>{floorText}</Text>
                    <View
                      style={[
                        st.priorityBadge,
                        isHigh ? st.priorityBadgeTinggi : st.priorityBadgeNormal,
                      ]}
                    >
                      <Text
                        style={[st.priorityDot, { color: isHigh ? '#FFFFFF' : '#059669' }]}
                      >
                        ●
                      </Text>
                      <Text
                        style={[
                          st.priorityBadgeText,
                          isHigh ? st.textWhite : st.textGreenDark,
                        ]}
                      >
                        {t.prioritas}
                      </Text>
                    </View>
                  </View>

                  <View style={st.dashTaskBottomRow}>
                    <Text style={st.dashTaskTime}>
                      ⏰{' '}
                      {t.tenggat
                        ? t.tenggat.toLowerCase().includes('hari ini')
                          ? `${shortDateStr}${t.tenggat.includes(',') ? ',' + t.tenggat.split(',')[1] : ''}`
                          : formatTaskDateReal(t.tenggat)
                        : `${shortDateStr}, 08.00`}
                    </Text>

                    <TouchableOpacity
                      style={st.btnCekDetail}
                      onPress={() => onOpenTask(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={st.btnCekDetailText}>Cek Detail</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredTasks.length === 0 && (
          <View style={st.emptyTaskBox}>
            <Text style={st.emptyTaskText}>Tidak ada tugas dalam kategori ini.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
